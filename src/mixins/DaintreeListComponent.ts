import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Ref, Watch } from "vue-property-decorator";
import { BTable } from "bootstrap-vue";

interface Metadata {
  stillPresent?: boolean;
  region?: string;
}

@Component
export class DaintreeListComponent<
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

  resources: {
    [key: string]: R & Metadata;
  } = {};

  drawerOpened = false;

  selectedResourceKey = "";
  filter = "";
  loadingCount = 0;

  wipResources: { [key: string]: R[K][] } = {};
  isPolling = false;

  //How to retrieve the resource for a given region?
  async getResourcesForRegion(
    region: string,
    filterById?: string[]
  ): Promise<R[]> {
    throw new Error("getResourcesForRegion not implemented");
  }

  //You can override this if the resource's state it's more difficult to retrieve
  getResourceState(resource: R): string | null {
    if (this.resourceStateKey) {
      return resource[this.resourceStateKey];
    }

    return null;
  }

  @Ref() readonly resourcesTable!: BTable;

  get resourcesAsList(): (R & Metadata)[] {
    return Object.values(this.resources);
  }

  get selectedResource(): (R & Metadata) | null {
    return this.resources[this.selectedResourceKey];
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

  getAllResources(): void {
    this.regionsEnabled.forEach((region) => {
      this.incrementLoadingCount();
      this.getResourcesForRegion(region)
        .then((resources) => {
          this.dataRetrieved(resources, region);
        })
        .catch((err) => {
          this.showError(err, this.resourceName, region);
        })
        .finally(() => {
          this.decreaseLoadingCount();
          this.selectActiveResource();
        });
    });
  }

  //Keep track if the resource of this region are still available
  markRegionForRefresh(region: string): void {
    Object.keys(this.resources).forEach((key) => {
      if (this.resources[key].region === region) {
        this.resources[key].stillPresent = false;
      }
    });
  }

  //Remove the resources tracked for the update that we don't have anymore: they have been deleted
  cleanResourcesNotUpdatedInRegion(region: string): void {
    Object.keys(this.resources).forEach((key) => {
      if (
        this.resources[key].region === region &&
        !this.resources[key].stillPresent
      ) {
        //If there was a notification about this resource, we dismiss it, and set a new one about the component being
        // deleted
        this.dismissAlertByResourceID(
          this.resources[key][this.resourceUniqueKey]
        );
        this.showAlert({
          variant: "warning",
          text: `Deleted ${this.resourceName} with ID ${key}`,
          key: `deletedResource${key}`,
        });
        this.$delete(this.resources, key);
      }
    });
  }

  dataRetrieved(resourcesList: R[], region: string, filterById?: R[K][]): void {
    if (!filterById) {
      this.markRegionForRefresh(region);
    }

    //When we retrieve only some resources, if we don't retrieve them it means they have been deleted
    if (filterById) {
      const retrievedIds = resourcesList.map((r) => r[this.resourceUniqueKey]);

      filterById.forEach((idFiltered) => {
        if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
          this.$delete(this.resources, idFiltered);
          //If there was a notification about this resource, we dismiss it
          this.dismissAlertByResourceID(idFiltered);
          this.showAlert({
            variant: "warning",
            text: `Deleted ${this.resourceName} with ID ${idFiltered}`,
            key: `deletedResource${idFiltered}`,
          });
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
      const resourceState = this.getResourceState(resource);
      if (
        resourceState &&
        this.workingStates.length > 0 &&
        this.workingStates.includes(resourceState)
      ) {
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

  close(): void {
    this.drawerOpened = false;
    const region = this.selectedResource?.region;
    if (region === undefined || !this.selectedResource) {
      return;
    }

    // Update the resource when the sidebar is closed, to refresh any data changed by the user
    if (region && this.selectedResource[this.resourceUniqueKey]) {
      const filters = [this.selectedResource[this.resourceUniqueKey]];

      this.getResourcesForRegion(region, filters)
        .then((resources) => this.dataRetrieved(resources, region, filters))
        .catch((err) => {
          this.showError(err, this.resourceName, region);
        });
    }

    this.selectedResourceKey = "";

    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.resourcesTable["$children"][0].clearSelected();

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ query: {} }).catch(() => {});
  }

  onRowSelected(resources: (R & Metadata)[]): void {
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

  startPolling(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipResources).forEach(async (region) => {
        if (this.wipResources[region].length > 0) {
          this.getResourcesForRegion(region, this.wipResources[region])
            .then((resources) => {
              this.dataRetrieved(resources, region, this.wipResources[region]);
            })
            .catch((err) => {
              this.showError(err, this.resourceName, region);
            });
        }
      });
    }, 5000);
  }

  @Watch("regionsEnabled")
  onRegionsEnabledChanged(newValue: string[], oldValue: string[]): void {
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
      this.incrementLoadingCount();
      this.getResourcesForRegion(region)
        .then((resources) => {
          this.dataRetrieved(resources, region);
        })
        .catch((err) => {
          this.showError(err, this.resourceName, region);
        })
        .finally(() => {
          this.decreaseLoadingCount();
        });
    });
  }

  //Changing roles requires to reload all resources
  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged(): void {
    this.resources = {};
    this.getAllResources();
  }

  mounted() {
    this.$root.$on("refresh", this.getAllResources);
  }

  beforeDestroy() {
    this.$root.$off("refresh");
  }

  beforeMount(): void {
    this.getAllResources();
  }

  destroyed(): void {
    this.$store.commit("notifications/dismissByKey", this.resourceName);
  }

  selectActiveResource(): void {
    //We wait until all the data have been loaded and then we select the row on the table.
    //This is necessary because every time the data of the table is updated, a row selected event with
    //0 elements is emitted, removing our selection
    if (typeof this.resourceUniqueKey !== "string") {
      return;
    }

    let uniqueId = "";

    //Unfortunately queries are case sensitive in vue-router, we need to find a matching parameter ignoring cases
    for (const key in this.$route.query) {
      if (Object.prototype.hasOwnProperty.call(this.$route.query, key)) {
        const value = this.$route.query[key];
        if (
          key.toLocaleLowerCase() === this.resourceUniqueKey.toLowerCase() &&
          typeof value === "string"
        ) {
          uniqueId = value;
        }
      }
    }

    if (uniqueId && !this.isLoading) {
      this.$nextTick().then(() => {
        const filteredResources = this.resourcesAsList.filter(
          (resource) => resource[this.resourceUniqueKey] === uniqueId
        );

        if (filteredResources && filteredResources.length > 0) {
          this.selectedResourceKey = uniqueId;
          this.drawerOpened = true;
          const index = this.resourcesAsList.findIndex(
            (resource) => resource[this.resourceUniqueKey] === uniqueId
          );
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          this.$refs.resourcesTable["$children"][0].selectRow(index);
        }
      });
    }
  }
}
