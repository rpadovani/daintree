<template>
  <div>
    <gl-table
      :items="flattenRules"
      :fields="fields"
      show-empty
      :fixed="true"
      :hover="true"
    >
      <template v-slot:empty>
        <gl-empty-state
          title="No rules found associated to this security group!"
          svg-path="/assets/undraw_void_3ggu.svg"
          compact
        />
      </template>

      <template v-slot:cell(port)="data">
        <div class="row">
          <gl-icon
            :name="data.item.editing ? 'cancel' : 'pencil'"
            @click="() => (data.item.editing = !data.item.editing)"
          />
          {{ data.item.fromPort }}
          <span v-if="data.item.fromPort !== data.item.toPort">
            - {{ data.item.toPort }}</span
          >
          <span
            v-if="
              data.item.fromPort === data.item.toPort &&
              data.item.fromPort === undefined
            "
            >All traffic</span
          >
        </div>
      </template>

      <template v-slot:cell(source)="data">
        <span v-if="data.item.cidr">{{ data.item.cidr }}</span>
        <router-link
          v-if="data.item.groupId"
          :to="`/network/securityGroups?securityGroupId=${data.item.groupId}`"
          >{{ data.item.groupId }}</router-link
        >
      </template>

      <template v-slot:cell(protocol)="data">
        <div class="row">
          <span v-if="data.value === '-1'">
            All protocols
          </span>
          <span v-else>
            {{ data.value }}
          </span>

          <gl-icon
            class="col-1"
            v-if="data.item.editing"
            name="check-circle"
            @click="
              () => {
                saveRule(data.item);
                data.item.editing = false;
              }
            "
          />

          <gl-button
            category="secondary"
            variant="danger"
            class="mt-n2 mb-n2"
            v-if="data.item.editing"
            @click="() => deleteRule(data.item)"
            size="small"
            >Delete rule
          </gl-button>
        </div>
      </template>
    </gl-table>

    <div class="row justify-content-between mt-3 pl-3 pr-2">
      <gl-form-input
        id="key-input"
        size="sm"
        class="col"
        placeholder="Port range"
        v-model="portRange"
      />
      <gl-form-input
        id="value-input"
        size="sm"
        class="col-5"
        placeholder="Source"
        v-model="newTagValue"
      />
      <gl-button
        :disabled="!canCreateNewRule"
        variant="success"
        category="secondary"
        icon="plus"
        @click="createNewTag"
      >
        New rule
      </gl-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  GlTable,
  GlEmptyState,
  GlIcon,
  GlButton,
  GlFormInput,
} from "@gitlab/ui";
import { IpPermission } from "aws-sdk/clients/ec2";
import { securityGroups } from "@/components/network/securityGroups/securityGroup";
import FlattenRule = securityGroups.FlattenRule;

@Component({
  components: { GlTable, GlEmptyState, GlIcon, GlButton, GlFormInput },
})
export default class ListOfRules extends Vue {
  @Prop(Array) readonly rules: IpPermission[] | undefined;
  @Prop(Boolean) readonly isOutbound: boolean | undefined;

  fields = [
    { key: "port", label: "Port range" },
    { key: "Source", label: this.isOutbound ? "Destination" : "Source" },

    { key: "sourceDescription", label: "Description" },
    "protocol",
  ];

  get flattenRules(): FlattenRule[] {
    const flattenRules: FlattenRule[] = [];
    this.rules?.forEach((r) => {
      r.IpRanges?.forEach((i) => {
        flattenRules.push({
          editing: false,
          cidr: i.CidrIp,
          sourceDescription: i.Description,

          fromPort: r.FromPort,
          toPort: r.ToPort,
          protocol: r.IpProtocol,
        });
      });

      r.Ipv6Ranges?.forEach((i) => {
        flattenRules.push({
          editing: false,

          cidr: i.CidrIpv6,
          sourceDescription: i.Description,

          fromPort: r.FromPort,
          toPort: r.ToPort,
          protocol: r.IpProtocol,
        });
      });

      r.UserIdGroupPairs?.forEach((g) => {
        flattenRules.push({
          editing: false,

          sourceDescription: g.Description,
          groupId: g.GroupId,
          groupName: g.GroupName,

          fromPort: r.FromPort,
          toPort: r.ToPort,
          protocol: r.IpProtocol,
        });
      });
    });

    return flattenRules;
  }
}
</script>

<style scoped></style>
