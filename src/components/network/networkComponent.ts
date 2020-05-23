import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Ref, Watch } from "vue-property-decorator";
import EC2Client, { Tag } from "aws-sdk/clients/ec2";
import { BTable } from "bootstrap-vue";

interface Metadata {
  stillPresent?: boolean;
  region?: string;
}

//We do not use an abstract class here because it breaks the scope calling abstract class method from within Vue
//template

//This class implements a lot of the common code used by all the resources inside network, providing some
//properties to customize some behavior
@Component
export class NetworkComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeComponent {
  //Mandatory parameters
  //The name of the resource (e.g., vpc)
  resourceName!: string;
  //Do we support resource creation?
  canCreate = false;
  //Which object property is used to identify it?
  resourceUniqueKey!: K;
  //Which object property is used to identify its state? If undefined polling of WIP resources will be disabled
  resourceStateKey: K | undefined;
  //Which values represent a working status?
  workingStates!: string[];

  //How to retrieve the resource for a given region?
  async getResourcesForRegion(
    region: string,
    filterById?: string[]
  ): Promise<R[]> {
    throw new Error("getResourcesForRegion not implemented");
  }

  //Properties managed by NetworkComponent that you still need in your component, so they are not marked as private
  resources: {
    [key: string]: R & Metadata;
  } = {};

  drawerOpened = false;

  selectedResourceKey = "";
  filter = "";
  loadingCount = 0;

  wipResources: { [key: string]: string[] } = {};
  isPolling = false;

  @Ref() readonly resourcesTable!: BTable;

  get resourcesAsList(): (R & Metadata)[] {
    return Object.values(this.resources);
  }

  get selectedResource(): (R & Metadata) | null {
    return this.resources[this.selectedResourceKey];
  }

  get selectedResourceTitle() {
    const nameTag = this.selectedResource?.Tags?.filter(
      (v: Tag) => v.Key === "Name"
    );

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedResource?.VpcId})`;
    }

    return this.selectedResource?.VpcId;
  }

  get emptyStateDescription(): string {
    let response = `Daintree hasn't found any ${this.resourceName} in the selected regions! You can `;

    if (this.canCreate) {
      response += `create a new one, or `;
    }

    response += `change selected regions in the settings. We have looked in ${this.regionsEnabled.join(
      ", "
    )}.`;

    return response;
  }

  getAllResources() {
    this.regionsEnabled.map((region) => {
      this.loadingCount++;
      this.getResourcesForRegion(region)
        .then((resources) => {
          this.dataRetrieved(resources, region);
        })
        .finally(() => {
          //We wait until all the data have been loaded and then we select the row on the table.
          //This is necessary because every time the data of the table is updated, a row selected event with
          //0 elements is emitted, removing our selection
          if (
            this.$route.query[this.resourceUniqueKey as string] &&
            this.loadingCount === 0
          ) {
            this.$nextTick().then(() => {
              const filteredResources = this.resourcesAsList.filter(
                (resource) =>
                  resource[this.resourceUniqueKey] ===
                  this.$route.query[this.resourceUniqueKey as string]
              );

              if (
                filteredResources &&
                filteredResources.length > 0 &&
                filteredResources[0][this.resourceUniqueKey]
              ) {
                this.selectedResourceKey =
                  filteredResources[0][this.resourceUniqueKey];
                this.drawerOpened = true;
                const index = this.resourcesAsList.findIndex(
                  (resource) =>
                    resource[this.resourceUniqueKey] ===
                    this.$route.query[this.resourceUniqueKey as string]
                );
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                //@ts-ignore
                this.$refs.resourcesTable["$children"][0].selectRow(index);
              }
            });
          }
        });
    });
  }

  async client(region: string) {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new EC2Client({ region, credentials });
    }
  }

  //Keep track if the resource of this region are still available
  markRegionForRefresh(region: string) {
    Object.keys(this.resources).forEach((key) => {
      if (this.resources[key].region === region) {
        this.resources[key].stillPresent = false;
      }
    });
  }

  //Remove the resources tracked for the update that we don't have anymore: they have been deleted
  cleanResourcesNotUpdatedInRegion(region: string) {
    Object.keys(this.resources).forEach((key) => {
      if (
        this.resources[key].region === region &&
        !this.resources[key].stillPresent
      ) {
        this.$delete(this.resources, key);
      }
    });
  }

  dataRetrieved(resourcesList: R[], region: string, filterById?: R[K][]) {
    if (!filterById) {
      this.loadingCount--;
      this.markRegionForRefresh(region);
    }

    //When we retrieve only some resources, if we don't retrieve them it means they have been deleted
    if (filterById) {
      const retrievedIds = resourcesList.map((r) => r[this.resourceUniqueKey]);

      filterById.forEach((idFiltered) => {
        if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
          this.$delete(this.resources, idFiltered);
        }
      });
    }

    resourcesList.forEach((resource) => {
      const id = resource[this.resourceUniqueKey];

      this.$set(this.resources, id, {
        ...resource,
        region,
        stillPresent: true,
      });

      //If we know how to identify a work in progress resource (e.g., a VPC which is being created), we store it and
      //start polling over it
      if (this.resourceStateKey && this.workingStates.includes(id)) {
        if (!this.wipResources[region]) {
          this.$set(this.wipResources, region, [id]);
        } else if (!this.wipResources[region].includes(id)) {
          this.wipResources[region].push(id);
        }
        this.startPolling();
      } else if (
        this.wipResources[region] &&
        this.wipResources[region].includes(id)
      ) {
        //We have finished polling this resource, since it is not anymore in a working state
        const resourceIndex = this.wipResources[region].findIndex(
          (v) => v === id
        );
        //If there was a notification about this resource, we dismiss it
        this.dismissAlertByResourceID(id);
        this.wipResources[region].slice(resourceIndex, resourceIndex + 1);
      }
    });

    //Remove resources not present anymore
    if (!filterById) {
      this.cleanResourcesNotUpdatedInRegion(region);
    }
  }

  close() {
    this.drawerOpened = false;
    const region = this.selectedResource?.region;
    if (region === undefined || !this.selectedResource) {
      return;
    }

    // Update the resource when the sidebar is closed, to refresh any data changed by the user
    if (region && this.selectedResource[this.resourceUniqueKey]) {
      const filters = [this.selectedResource[this.resourceUniqueKey]];

      this.getResourcesForRegion(region, filters).then((resources) =>
        this.dataRetrieved(resources, region, filters)
      );
    }

    this.selectedResourceKey = "";

    //eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.resourcesTable["$children"][0].clearSelected();

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ query: {} }).catch(() => {});
  }

  onRowSelected(resources: (R & Metadata)[]) {
    if (resources.length > 0 && resources[0][this.resourceUniqueKey]) {
      this.selectedResourceKey = resources[0][this.resourceUniqueKey];
      this.drawerOpened = true;
      this.$router
        .push({
          query: { [this.resourceUniqueKey]: this.selectedResourceKey },
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    } else {
      this.close();
    }
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipResources).forEach(async (region) => {
        if (this.wipResources[region].length > 0) {
          this.getResourcesForRegion(region, this.wipResources[region]).then(
            (resources) => {
              this.dataRetrieved(resources, region);
            }
          );
        }
      });
    }, 5000);
  }

  @Watch("regionsEnabled")
  onRegionsEnabledChanged(newValue: string[], oldValue: string[]) {
    const addedRegions = [...newValue.filter((d) => !oldValue.includes(d))];
    const removedRegions = [...oldValue.filter((d) => !newValue.includes(d))];

    if (removedRegions.length > 0) {
      this.resourcesAsList.forEach((resource) => {
        if (
          resource.region &&
          removedRegions.includes(resource.region) &&
          resource[this.resourceUniqueKey]
        ) {
          this.$delete(this.resources, resource[this.resourceUniqueKey]);
        }
      });
    }

    addedRegions.forEach((region) => {
      this.loadingCount++;
      this.getResourcesForRegion(region).then((resources) => {
        this.dataRetrieved(resources, region);
      });
    });
  }

  //Changing roles requires to reload all resources
  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.resources = {};
    this.getAllResources();
  }

  beforeMount() {
    this.getAllResources();
  }
}
