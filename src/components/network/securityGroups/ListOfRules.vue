<template>
  <gl-table :items="flattenRules" :fields="fields" show-empty>
    <template v-slot:empty>
      <gl-empty-state
        title="No rules found associated to this security group!"
        svg-path="/assets/undraw_void_3ggu.svg"
        compact
      />
    </template>

    <template v-slot:cell(port)="data">
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
    </template>

    <template v-slot:cell(source)="data">
      <span v-if="data.item.cidr">{{ data.item.cidr }}</span>
      <router-link
        v-if="data.item.groupId"
        :to="`/network/securityGroups?securityGroupId=${data.item.groupId}`"
        >{{ data.item.groupId }}</router-link
      >
    </template>
  </gl-table>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { GlTable, GlEmptyState } from "@gitlab/ui";
import { IpPermission } from "aws-sdk/clients/ec2";
import { securityGroups } from "@/components/network/securityGroups/securityGroup";
import FlattenRule = securityGroups.FlattenRule;

@Component({ components: { GlTable, GlEmptyState } })
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
          cidr: i.CidrIp,
          sourceDescription: i.Description,

          fromPort: r.FromPort,
          toPort: r.ToPort,
          protocol: r.IpProtocol,
        });
      });

      r.Ipv6Ranges?.forEach((i) => {
        flattenRules.push({
          cidr: i.CidrIpv6,
          sourceDescription: i.Description,

          fromPort: r.FromPort,
          toPort: r.ToPort,
          protocol: r.IpProtocol,
        });
      });

      r.UserIdGroupPairs?.forEach((g) => {
        flattenRules.push({
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
