import { Component } from "vue-property-decorator";
import ECS, { Tag } from "aws-sdk/clients/ecs";
import { DaintreeListComponent } from "@/mixins/DaintreeListComponent";

@Component
export class EcsComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeListComponent<R, K> {
  get selectedResourceTitle(): string {
    if (!this.selectedResource) {
      return "";
    }
    const nameTag = this.selectedResource.Tags?.filter(
      (v: Tag) => v.key === "Name"
    );

    const resourceKey = this.selectedResource[this.resourceUniqueKey];

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${resourceKey})`;
    }

    return resourceKey;
  }

  async client(region: string): Promise<ECS | void> {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new ECS({ region, credentials });
    }
  }
}
