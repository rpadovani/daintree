import { Component } from "vue-property-decorator";
import EC2Client, { Tag, TagList } from "aws-sdk/clients/ec2";
import { DaintreeListComponent } from "@/mixins/DaintreeListComponent";

@Component
export class NetworkComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeListComponent<R, K> {
  get selectedResourceTitle(): string {
    if (!this.selectedResource) {
      return "";
    }
    const nameTag = this.selectedResource.Tags?.filter(
      (v: Tag) => v.Key === "Name"
    );

    const resourceKey = this.selectedResource[this.resourceUniqueKey];

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${resourceKey})`;
    }

    return resourceKey;
  }

  extractNameFromTags(tags: TagList): string | undefined {
    const nameTag = tags.filter((v) => v.Key === "Name");

    if (nameTag.length > 0) {
      return nameTag[0].Value;
    }

    return "";
  }

  async client(region: string): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new EC2Client({ region, credentials });
    }
  }
}
