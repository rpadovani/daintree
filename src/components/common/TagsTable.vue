<template>
  <div>
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage.length > 0"
      @dismiss="() => (alertMessage = '')"
      >{{ alertMessage }}
    </gl-alert>

    <gl-table
      :items="tagList"
      :fields="fields"
      fixed
      hover
      show-empty
      :busy="tagsState === 'loading'"
    >
      <template v-slot:cell(key)="data">
        <div class="row">
          <gl-icon
            :name="data.item.editing ? 'cancel' : 'pencil'"
            @click="() => (data.item.editing = !data.item.editing)"
          />
          <gl-form-input
            class="col-9 ml-2 mt-n2 mb-n2 pl-2"
            v-if="data.item.editing"
            v-model="data.item.Key"
          />
          <span class="col-9" v-if="!data.item.editing">
            {{ data.value }}
          </span>
        </div>
      </template>

      <template v-slot:cell(value)="data">
        <div class="row">
          <gl-form-input
            class="col-9 ml-2 mt-n2 mb-n2 pl-2"
            v-if="data.item.editing"
            v-model="data.item.Value"
          />
          <gl-icon
            class="col-1"
            v-if="data.item.editing"
            name="check-circle"
            @click="
              () => {
                saveTag(data.item);
                data.item.editing = false;
              }
            "
          />

          <gl-button
            category="secondary"
            variant="danger"
            class="mt-n2 mb-n2"
            v-if="data.item.editing"
            @click="() => deleteTag(data.item)"
            size="small"
            >Delete tag
          </gl-button>
          <span class="col-9" v-if="!data.item.editing">
            {{ data.value }}
          </span>
        </div>
      </template>

      <template v-slot:table-busy>
        <gl-skeleton-loading />
      </template>

      <template v-slot:empty="">
        <gl-empty-state
          class="mt-5"
          title="No tags found associated to this resource!"
          svg-path="/assets/undraw_void_3ggu.svg"
          description="You can always create a new tag right now, with the form just below."
          compact
        />
      </template>
    </gl-table>

    <div class="row justify-content-between mt-3 pl-3 pr-2">
      <gl-form-input
        id="key-input"
        class="col-5"
        placeholder="Key"
        v-model="newTagKey"
      />
      <gl-form-input
        id="value-input"
        class="col-5"
        placeholder="Value"
        v-model="newTagValue"
      />
      <gl-button
        :disabled="newTagValue.length < 1 || newTagKey.length < 1"
        variant="success"
        category="secondary"
        icon="plus"
        @click="createNewTag"
      >
        New tag
      </gl-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { TagList, Tag } from "aws-sdk/clients/ec2";
import ECS from "aws-sdk/clients/ecs";
import {
  GlTable,
  GlIcon,
  GlFormInput,
  GlAlert,
  GlButton,
  GlEmptyState,
  GlSkeletonLoading,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import SNSClient from "aws-sdk/clients/sns";
import SQSClient from "aws-sdk/clients/sqs";
import { isString } from "@/utils/isString";
import { AWSError } from "aws-sdk/lib/error";
import ELBv2Client from "aws-sdk/clients/elbv2";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

interface TagWithMetadata extends Tag {
  editing: boolean;
  originalKey: string | undefined;
}

@Component({
  components: {
    GlTable,
    GlIcon,
    GlFormInput,
    GlAlert,
    GlButton,
    GlEmptyState,
    GlSkeletonLoading,
  },
})
export default class TagsTable extends DaintreeComponent {
  @Prop(Array) readonly tags: TagList | ECS.Tags | undefined;
  @Prop(String) readonly region!: string;
  @Prop(String) readonly resourceId!: string;
  @Prop(String) readonly provider:
    | "EC2"
    | "SQS"
    | "SNS"
    | "ELB"
    | "ECS"
    | undefined;

  readonly fields = [
    { key: "Key", sortable: true },
    { key: "Value", sortable: true },
  ];

  tagsState: "loading" | "loaded" | "empty" | "error" = "loaded";

  alertMessage = "";
  alertVariant: string | undefined;
  incomingTags: TagList = Object.assign([], this.tags);

  newTagKey = "";
  newTagValue = "";

  get tagList(): TagWithMetadata[] {
    const returnedTags: TagWithMetadata[] = [];
    this.incomingTags.forEach((tag) => {
      returnedTags.push({
        editing: false,
        originalKey: tag.Key,
        ...tag,
      });
    });
    return returnedTags;
  }

  async client(): Promise<
    EC2Client | ECS | SQSClient | ELBv2Client | SNSClient
  > {
    const credentials = await this.credentials();
    const clientOptions = {
      region: this.region,
      credentials,
    };

    switch (this.provider) {
      case "SQS":
        return new SQSClient(clientOptions);
      case "SNS":
        return new SNSClient(clientOptions);
      case "ELB":
        return new ELBv2Client(clientOptions);
      case "ECS":
        return new ECS(clientOptions);
      case "EC2":
      default:
        //When the project started the tags table was way easier, so we fallback to EC2 to do not
        //update the first components
        return new EC2Client(clientOptions);
    }
  }

  async showErrorIfAny(err: AWSError, reloadOnError: boolean): Promise<void> {
    this.alertMessage = err.message;
    this.alertVariant = "danger";

    if (reloadOnError) {
      await this.reloadAllTags();
    }
  }

  async reloadAllTags(): Promise<void> {
    const client = await this.client();
    this.tagsState = "loading";

    try {
      if (client instanceof EC2Client) {
        const params = {
          Filters: [
            {
              Name: "resource-id",
              Values: [this.resourceId],
            },
          ],
        };

        const data = await client.describeTags(params).promise();
        this.incomingTags = data.Tags || [];
      } else if (client instanceof SQSClient) {
        const data = await client
          .listQueueTags({ QueueUrl: this.resourceId })
          .promise();

        const newTags: TagList = [];
        Object.entries(data.Tags || []).forEach(([Key, Value]) => {
          newTags.push({ Key, Value });
        });
        this.incomingTags = newTags;
      } else if (client instanceof SNSClient) {
        const data = await client
          .listTagsForResource({ ResourceArn: this.resourceId })
          .promise();
        this.incomingTags = data.Tags || [];
      } else if (client instanceof ELBv2Client) {
        const data = await client
          .describeTags({ ResourceArns: [this.resourceId] })
          .promise();
        if (
          data.TagDescriptions &&
          data.TagDescriptions.length > 0 &&
          data.TagDescriptions[0].Tags
        ) {
          this.incomingTags = data.TagDescriptions[0].Tags;
        }
      } else if (client instanceof ECS) {
        const data = await client
          .listTagsForResource({ resourceArn: this.resourceId })
          .promise();
        const newTags: TagList = [];
        (data.tags || []).forEach((tag) => {
          newTags.push({ Key: tag.key, Value: tag.value });
        });
        this.incomingTags = newTags;
      }

      this.tagsState = "loaded";
    } catch (err) {
      await this.showErrorIfAny(err, false);

      this.tagsState = "error";
    }
  }

  newTagCreated(tag: Tag): void {
    this.incomingTags.push(tag);
    this.newTagKey = "";
    this.newTagValue = "";
  }

  async createNewTag(): Promise<void> {
    try {
      this.tagsState = "loading";
      const tag = { Key: this.newTagKey, Value: this.newTagValue };
      const client = await this.client();

      if (client instanceof EC2Client) {
        const params = { Resources: [this.resourceId], Tags: [tag] };
        await client.createTags(params).promise();
      } else if (client instanceof SQSClient) {
        const Tags: { [key: string]: string } = {};
        const params = { QueueUrl: this.resourceId, Tags };

        params.Tags[this.newTagKey] = this.newTagValue;

        await client.tagQueue(params);
      } else if (client instanceof SNSClient) {
        const params = { ResourceArn: this.resourceId, Tags: [tag] };

        await client.tagResource(params).promise();
      } else if (client instanceof ELBv2Client) {
        const params = { ResourceArns: [this.resourceId], Tags: [tag] };

        await client.addTags(params).promise();
      } else if (client instanceof ECS) {
        const params = {
          resourceArn: this.resourceId,
          tags: [{ key: tag.Key, value: tag.Value }],
        };

        await client.tagResource(params).promise();
      }

      this.newTagCreated(tag);
      this.tagsState = "loaded";
    } catch (err) {
      this.tagsState = "error";
      await this.showErrorIfAny(err, true);
    }
  }

  tagSaved(tag: TagWithMetadata): void {
    this.alertMessage = "Tag edited successfully";
    this.alertVariant = "success";

    if (tag.originalKey !== tag.Key) {
      //If the user changed the key, we need to push the new one, since the old one has been deleted
      tag.originalKey = tag.Key;
      this.incomingTags.push(tag);
    }
  }

  async saveTag(tag: TagWithMetadata): Promise<void> {
    if (!isString(tag.Key) || !isString(tag.Value)) {
      return;
    }

    //If the key has changed from its original value, we need to first delete the previous tag,
    //and then create a new one, because we cannot update an existing key
    if (tag.originalKey !== tag.Key) {
      await this.deleteTag(tag);
    }

    try {
      const client = await this.client();

      if (client instanceof EC2Client) {
        const params = {
          Resources: [this.resourceId],
          Tags: [{ Key: tag.Key, Value: tag.Value }],
        };

        await client.createTags(params).promise();
      } else if (client instanceof SQSClient) {
        const Tags: { [key: string]: string } = {};
        const params = {
          QueueUrl: this.resourceId,
          Tags,
        };

        params.Tags[tag.Key] = tag.Value;
        await client.tagQueue(params).promise();
      } else if (client instanceof SNSClient) {
        const params = {
          ResourceArn: this.resourceId,
          Tags: [{ Key: tag.Key, Value: tag.Value }],
        };

        await client.tagResource(params).promise();
      } else if (client instanceof ELBv2Client) {
        const params = {
          ResourceArns: [this.resourceId],
          Tags: [{ Key: tag.Key, Value: tag.Value }],
        };

        await client.addTags(params).promise();
      } else if (client instanceof ECS) {
        const params = {
          resourceArn: this.resourceId,
          tags: [{ key: tag.Key, value: tag.Value }],
        };

        await client.tagResource(params).promise();
      }

      this.tagSaved(tag);
    } catch (err) {
      await this.showErrorIfAny(err, true);
    }
  }

  async deleteTag(tag: TagWithMetadata): Promise<void> {
    try {
      const client = await this.client();
      if (client instanceof EC2Client) {
        const params = {
          Resources: [this.resourceId],
          Tags: [{ Key: tag.Key, Value: tag.Value }],
        };

        await client.deleteTags(params).promise();
      } else if (client instanceof SQSClient && tag.Key) {
        const params = {
          QueueUrl: this.resourceId,
          TagKeys: [tag.Key],
        };

        await client.untagQueue(params).promise();
      } else if (client instanceof SNSClient && tag.Key) {
        const params = {
          ResourceArn: this.resourceId,
          TagKeys: [tag.Key],
        };

        await client.untagResource(params).promise();
      } else if (client instanceof ELBv2Client && tag.Key) {
        const params = {
          ResourceArns: [this.resourceId],
          TagKeys: [tag.Key],
        };
        await client.removeTags(params).promise();
      } else if (client instanceof ECS && tag.Key) {
        const params = {
          resourceArn: this.resourceId,
          tagKeys: [tag.Key],
        };

        await client.untagResource(params).promise();
      }

      this.removeFromTagList(tag.originalKey);
    } catch (err) {
      await this.showErrorIfAny(err, true);
    }
  }

  removeFromTagList(originalKey: string | undefined): void {
    this.incomingTags = this.incomingTags?.filter(
      (tag) => tag.Key !== originalKey
    );
  }

  @Watch("resourceId")
  onResourceIdChanged(): void {
    this.incomingTags = Object.assign([], this.tags);

    if (this.provider && ["SQS", "SNS", "ELB", "ECS"].includes(this.provider)) {
      this.reloadAllTags();
    }
  }

  mounted(): void {
    // SQS, SNS, and load balancers don't provide tags on their own
    if (this.provider && ["SQS", "SNS", "ELB", "ECS"].includes(this.provider)) {
      this.reloadAllTags();
    }
  }
}
</script>
