<template>
  <gl-table :items="routes" :fields="routesFields">
    <template v-slot:cell(destination)="data">
      {{
        data.item.DestinationCidrBlock ||
        data.item.DestinationPrefixListId ||
        data.item.DestinationIpv6CidrBlock
      }}
    </template>

    <template v-slot:cell(target)="data">
      <router-link
        v-if="data.item.GatewayId && data.item.GatewayId !== 'local'"
        :to="`/network/igws?igwId=${data.item.GatewayId}`"
      >
        {{ data.item.GatewayId }}</router-link
      >
      <span v-else-if="data.item.GatewayId && data.item.GatewayId === 'local'"
        >local</span
      >
      <router-link
        v-else-if="data.item.NatGatewayId"
        :to="`/network/nat?natId=${data.item.NatGatewayId}`"
      >
        {{ data.item.NatGatewayId }}
      </router-link>
      <router-link
        v-else-if="data.item.VpcPeeringConnectionId"
        :to="`/network/peeringConnections?VpcPeeringConnectionId=${data.item.VpcPeeringConnectionId}`"
      >
        {{ data.item.VpcPeeringConnectionId }}
      </router-link>
      <span v-else>{{ data.item }}</span>
    </template>

    <template v-slot:cell(state)="data">
      <StateText :state="data.value" />
    </template>
  </gl-table>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { GlTable } from "@gitlab/ui";
import { RouteList } from "aws-sdk/clients/ec2";
import StateText from "@/components/common/StateText.vue";

@Component({ components: { GlTable, StateText } })
export default class ListOfRoutes extends Vue {
  @Prop(Array) readonly routes: RouteList | undefined;

  routesFields = ["Destination", "Target", "State", "Origin"];
}
</script>
