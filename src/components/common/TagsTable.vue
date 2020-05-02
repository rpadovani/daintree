<template>
  <div>
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage.length > 0"
      @dismiss="() => (alertMessage = '')"
      >{{ alertMessage }}</gl-alert
    >

    <gl-empty-state
      class="mt-5"
      v-if="tagList.length < 1"
      title="No tags found associated to this resource!"
      svg-path="/assets/undraw_void_3ggu.svg"
      description="You can always create a new tag right now, with the form just below."
      compact
    />

    <gl-table v-if="tagList.length > 0" :items="tagList" :fields="fields" fixed>
      <template v-slot:cell(key)="data">
        <div class="row">
          <gl-icon
            :name="data.item.editing ? 'cancel' : 'pencil'"
            @click="() => (data.item.editing = !data.item.editing)"
          />
          <gl-form-input
            size="sm"
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
            size="sm"
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
            >Delete tag</gl-button
          >
          <span class="col-9" v-if="!data.item.editing">
            {{ data.value }}
          </span>
        </div>
      </template>
    </gl-table>

    <div class="row justify-content-between mt-3 pl-3 pr-2">
      <gl-form-input
        id="key-input"
        size="sm"
        class="col-5"
        placeholder="Key"
        v-model="newTagKey"
      />
      <gl-form-input
        id="value-input"
        size="sm"
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
import { Vue, Component, Prop } from "vue-property-decorator";
import { TagList, Tag } from "aws-sdk/clients/ec2";
import {
  GlTable,
  GlIcon,
  GlFormInput,
  GlAlert,
  GlButton,
  GlEmptyState,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import SNSClient from "aws-sdk/clients/sns";
import SQSClient from "aws-sdk/clients/sqs";
import { isString } from "@/utils/isString";
import { AWSError } from "aws-sdk/lib/error";

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
  },
})
export default class TagsTable extends Vue {
  @Prop(Array) readonly tags: TagList | undefined;
  @Prop(String) readonly region!: string;
  @Prop(String) readonly resourceId!: string;
  @Prop(String) readonly provider: "EC2" | "SQS" | "SNS" | undefined;

  fields = [
    { key: "Key", sortable: true },
    { key: "Value", sortable: true },
  ];

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

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  reloadAllTags() {
    if (this.provider === "EC2" || !this.provider) {
      const params = {
        Filters: [
          {
            Name: "resource-id",
            Values: [this.resourceId],
          },
        ],
      };

      const EC2 = new EC2Client({
        region: this.region,
        credentials: this.credentials,
      });

      EC2.describeTags(params, (err, data) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else if (data.Tags) {
          this.incomingTags = data.Tags;
        }
      });
    } else if (this.provider === "SQS") {
      const SQS = new SQSClient({
        region: this.region,
        credentials: this.credentials,
      });
      SQS.listQueueTags({ QueueUrl: this.resourceId }, (err, data) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else if (data.Tags) {
          const newTags: TagList = [];
          Object.entries(data.Tags).forEach(([Key, Value]) => {
            newTags.push({ Key, Value });
          });
          this.incomingTags = newTags;
        }
      });
    } else if (this.provider === "SNS") {
      const SNS = new SNSClient({
        region: this.region,
        credentials: this.credentials,
      });
      SNS.listTagsForResource({ ResourceArn: this.resourceId }, (err, data) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else if (data.Tags) {
          this.incomingTags = data.Tags;
        }
      });
    }
  }

  callbackCreateNewTag(tag: Tag, err: AWSError) {
    if (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
      this.reloadAllTags();
    } else {
      this.incomingTags.push(tag);
      this.newTagKey = "";
      this.newTagValue = "";
    }
  }

  createNewTag() {
    const tag = { Key: this.newTagKey, Value: this.newTagValue };

    if (this.provider === "EC2" || !this.provider) {
      const EC2 = new EC2Client({ region: this.region });

      const params = {
        Resources: [this.resourceId],
        Tags: [tag],
      };

      EC2.createTags(params, (err) => this.callbackCreateNewTag(tag, err));
    } else if (this.provider === "SQS") {
      const SQS = new SQSClient({
        region: this.region,
        credentials: this.credentials,
      });
      const Tags: { [key: string]: string } = {};
      const params = {
        QueueUrl: this.resourceId,
        Tags,
      };

      params.Tags[this.newTagKey] = this.newTagValue;

      SQS.tagQueue(params, (err) => this.callbackCreateNewTag(tag, err));
    } else if (this.provider === "SNS") {
      const SNS = new SNSClient({
        region: this.region,
        credentials: this.credentials,
      });
      const params = {
        ResourceArn: this.resourceId,
        Tags: [tag],
      };

      SNS.tagResource(params, (err) => this.callbackCreateNewTag(tag, err));
    }
  }

  callbackSaveTag(tag: TagWithMetadata, err: AWSError) {
    if (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
      this.reloadAllTags();
    } else {
      this.alertMessage = "Tag edited successfully";
      this.alertVariant = "success";

      if (tag.originalKey !== tag.Key) {
        //If the user changed the key, we need to push the new one, since the old one has been deleted
        tag.originalKey = tag.Key;
        this.incomingTags.push(tag);
      }
    }
  }

  saveTag(tag: TagWithMetadata) {
    //If the key has changed from its original value, we need to first delete the previous tag,
    //and then create a new one, because we cannot update an existing key
    if (tag.originalKey !== tag.Key) {
      this.deleteTag(tag);
    }

    if (this.provider === "EC2" || !this.provider) {
      const EC2 = new EC2Client({ region: this.region });

      const params = {
        Resources: [this.resourceId],
        Tags: [{ Key: tag.Key, Value: tag.Value }],
      };

      EC2.createTags(params, (err) => this.callbackSaveTag(tag, err));
    } else if (
      this.provider === "SQS" &&
      isString(tag.Key) &&
      isString(tag.Value)
    ) {
      const SQS = new SQSClient({
        region: this.region,
        credentials: this.credentials,
      });
      const Tags: { [key: string]: string } = {};
      const params = {
        QueueUrl: this.resourceId,
        Tags,
      };

      params.Tags[tag.Key] = tag.Value;
      SQS.tagQueue(params, (err) => this.callbackSaveTag(tag, err));
    } else if (
      this.provider === "SNS" &&
      isString(tag.Key) &&
      isString(tag.Value)
    ) {
      const SNS = new SNSClient({
        region: this.region,
        credentials: this.credentials,
      });
      const params = {
        ResourceArn: this.resourceId,
        Tags: [{ Key: tag.Key, Value: tag.Value }],
      };

      SNS.tagResource(params, (err) => this.callbackSaveTag(tag, err));
    }
  }

  callbackDeleteTag(originalKey: string | undefined, err: AWSError) {
    if (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
      this.reloadAllTags();
    } else {
      this.removeFromTagList(originalKey);
    }
  }

  deleteTag(tag: TagWithMetadata) {
    if (this.provider === "EC2" || !this.provider) {
      const EC2 = new EC2Client({ region: this.region });

      const params = {
        Resources: [this.resourceId],
        Tags: [{ Key: tag.Key, Value: tag.Value }],
      };

      EC2.deleteTags(params, (err) =>
        this.callbackDeleteTag(tag.originalKey, err)
      );
    } else if (this.provider === "SQS" && tag.Key) {
      const SQS = new SQSClient({
        region: this.region,
        credentials: this.credentials,
      });

      const params = {
        QueueUrl: this.resourceId,
        TagKeys: [tag.Key],
      };

      SQS.untagQueue(params, (err) =>
        this.callbackDeleteTag(tag.originalKey, err)
      );
    } else if (this.provider === "SNS" && tag.Key) {
      const SNS = new SNSClient({
        region: this.region,
        credentials: this.credentials,
      });
      const params = {
        ResourceArn: this.resourceId,
        TagKeys: [tag.Key],
      };

      SNS.untagResource(params, (err) =>
        this.callbackDeleteTag(tag.originalKey, err)
      );
    }
  }

  removeFromTagList(originalKey: string | undefined) {
    this.incomingTags = this.incomingTags?.filter(
      (tag) => tag.Key !== originalKey
    );
  }

  mounted() {
    // SQS and SNS don't provide tags on their own
    if (this.provider && ["SQS", "SNS"].includes(this.provider)) {
      this.reloadAllTags();
    }
  }
}
</script>

<style scoped></style>
