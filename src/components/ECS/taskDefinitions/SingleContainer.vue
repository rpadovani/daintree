<template>
  <div>
    <DrawerCards :cards="cards" />

    <CollapsableCard
      v-if="container.environment && container.environment.length > 0"
      title="Environment variables"
      help-text="The environment variables to pass to a container. This parameter maps to
              Env in the Create a container section of the Docker Remote API and the
              --env option to docker run."
    >
      <gl-table
        :items="container.environment"
        :fields="environmentFields"
        small
        stacked="sm"
      />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.links && container.links.length > 0"
      title="Links"
      help-text="The links parameter allows containers to communicate with each other without the need for port mappings. This parameter is only supported if the network mode of a task definition is bridge. The name:internalName construct is analogous to name:alias in Docker links. Up to 255 letters (uppercase and lowercase), numbers, and hyphens are allowed. For more information about linking Docker containers, go to Legacy container links in the Docker documentation. This parameter maps to Links in the Create a container section of the Docker Remote API and the --link option to docker run."
    >
      <ul>
        <li v-for="link in container.links" :key="link">{{ link }}</li>
      </ul>
    </CollapsableCard>

    <CollapsableCard
      v-if="container.portMappings && container.portMappings.length > 0"
      title="Port mappings"
      help-text="The list of port mappings for the container. Port mappings allow containers to access ports on the host container instance to send or receive traffic. This parameter maps to PortBindings in the Create a container section of the Docker Remote API and the --publish option to docker run."
    >
      <gl-table :items="container.portMappings" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.environmentFiles && container.environmentFiles.length > 0"
      title="Environment files"
      help-text="A list of files containing the environment variables to pass to a container. This parameter maps to the --env-file option to docker run."
    >
      <gl-table :items="container.environmentFiles" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.mountPoints && container.mountPoints.length > 0"
      title="Mount points"
      help-text="The mount points for data volumes in your container.

This parameter maps to Volumes in the Create a container section of the Docker Remote API and the --volume option to docker run."
    >
      <gl-table :items="container.mountPoints" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.volumesFrom && container.volumesFrom.length > 0"
      title="Volumes from"
      help-text="Data volumes to mount from another container. This parameter maps to VolumesFrom in the Create a container section of the Docker Remote API and the --volumes-from option to docker run."
    >
      <gl-table :items="container.volumesFrom" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.secrets && container.secrets.length > 0"
      title="Secrets"
      help-text="The secrets to pass to the container."
    >
      <gl-table :items="container.secrets" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.dependsOn && container.dependsOn.length > 0"
      title="Depends on"
      help-text="The dependencies defined for container startup and shutdown. A container can contain multiple dependencies. When a dependency is defined for container startup, for container shutdown it is reversed."
    >
      <gl-table :items="container.dependsOn" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="container.dnsServers && container.dnsServers.length > 0"
      title="DNS servers"
      help-text="A list of DNS servers that are presented to the container. This parameter maps to Dns in the Create a container section of the Docker Remote API and the --dns option to docker run."
    >
      <ul>
        <li v-for="server in container.dnsServers" :key="server">
          {{ server }}
        </li>
      </ul>
    </CollapsableCard>

    <CollapsableCard
      v-if="container.dnsSearchDomains && container.dnsSearchDomains.length > 0"
      title="DNS search domains"
      help-text="A list of DNS search domains that are presented to the container. This parameter maps to DnsSearch in the Create a container section of the Docker Remote API and the --dns-search option to docker run."
    >
      <ul>
        <li v-for="domain in container.dnsSearchDomains" :key="domain">
          {{ domain }}
        </li>
      </ul>
    </CollapsableCard>

    <CollapsableCard
      v-if="container.extraHosts && container.extraHosts.length > 0"
      title="Extra hosts"
      help-text="A list of hostnames and IP address mappings to append to the /etc/hosts file on the container. This parameter maps to ExtraHosts in the Create a container section of the Docker Remote API and the --add-host option to docker run."
    >
      <gl-table :items="container.extraHosts" small stacked="sm" />
    </CollapsableCard>

    <CollapsableCard
      v-if="
        container.dockerSecurityOptions &&
        container.dockerSecurityOptions.length > 0
      "
      title="Docker security options"
      help-text="A list of strings to provide custom labels for SELinux and AppArmor multi-level security systems. This field is not valid for containers in tasks using the Fargate launch type."
    >
      <ul>
        <li v-for="sec in container.dockerSecurityOptions" :key="sec">
          {{ sec }}
        </li>
      </ul>
    </CollapsableCard>

    <CollapsableCard
      v-if="container.ulimits && container.ulimits.length > 0"
      title="ulimits"
      help-text="A list of ulimits to set in the container. If a ulimit value is specified in a task definition, it will override the default values set by Docker. This parameter maps to Ulimits in the Create a container section of the Docker Remote API and the --ulimit option to docker run."
    >
      <gl-table :items="container.ulimits" small stacked="sm" />
    </CollapsableCard>
  </div>
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { ContainerDefinition } from "aws-sdk/clients/ecs";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { GlTable } from "@gitlab/ui";
import CollapsableCard from "@/components/common/CollapsableCard.vue";

@Component({
  components: {
    CollapsableCard,
    DrawerCards,
    GlTable,
  },
})
export default class SingleContainer extends DaintreeComponent {
  @Prop(Object) readonly container!: ContainerDefinition;

  readonly environmentFields = [
    {
      key: "name",
      sortable: true,
    },
    "value",
  ];

  //TODO:  linuxParameters, dockerlabels, logconfiguration, healthcheck, systemcontrol, resourcerequirements, firelensConfiguration
  get cards(): CardContent[] {
    return [
      {
        title: "Name",
        value: this.container.name,
        helpText:
          "The name of a container. This parameter maps to name in the Create a container section of the Docker Remote API and the --name option to docker run.",
      },
      {
        title: "Image",
        value: this.container.image,
        helpText:
          "The image used to start a container. This string is passed directly to the Docker daemon. Images in the Docker Hub registry are available by default. Other repositories are specified with either repository-url/image:tag or repository-url/image@digest . This parameter maps to Image in the Create a container section of the Docker Remote API and the IMAGE parameter of docker run.",
      },
      {
        title: "CPUs",
        value: this.container.cpu,
        helpText:
          "The number of cpu units reserved for the container. This parameter maps to CpuShares in the Create a container section of the Docker Remote API and the --cpu-shares option to docker run.",
      },
      {
        title: "Memory",
        value: `${this.container?.memory || "N/A"} MiB`,
        helpText:
          "The amount of memory to present to the container. If your container attempts to exceed the memory specified here, the container is killed. The total amount of memory reserved for all containers within a task must be lower than the task memory value, if one is specified. This parameter maps to Memory in the Create a container section of the Docker Remote API and the --memory option to docker run.",
      },
      {
        title: "Memory reservation",
        value: `${this.container?.memoryReservation || "N/A"} MiB`,
        helpText:
          "The soft limit of memory to reserve for the container. When system memory is under heavy contention, Docker attempts to keep the container memory to this soft limit. However, your container can consume more memory when it needs to, up to either the hard limit specified with the memory parameter (if applicable), or all of the available memory on the container instance, whichever comes first. This parameter maps to MemoryReservation in the Create a container section of the Docker Remote API and the --memory-reservation option to docker run.",
      },
      {
        title: "Is essential?",
        value: this.container.essential,
        helpText:
          "If the essential parameter of a container is marked as true, and that container fails or stops for any reason, all other containers that are part of the task are stopped. If the essential parameter of a container is marked as false, then its failure does not affect the rest of the containers in a task.",
      },
      {
        title: "Entry point",
        value: this.container.entryPoint?.join(" "),
        helpText:
          "The entry point that is passed to the container. This parameter maps to Entrypoint in the Create a container section of the Docker Remote API and the --entrypoint option to docker run.",
        isCode: true,
      },

      {
        title: "Command",
        value: this.container.command?.join(" "),
        helpText:
          "The command that is passed to the container. This parameter maps to Cmd in the Create a container section of the Docker Remote API and the COMMAND parameter to docker run.",
        isCode: true,
      },
      {
        title: "Start timeout",
        value: `${this.container.startTimeout || "N/A"} seconds`,
        helpText:
          "Time duration to wait before giving up on resolving dependencies for a container. For example, you specify two containers in a task definition with containerA having a dependency on containerB reaching a COMPLETE, SUCCESS, or HEALTHY status. If a startTimeout value is specified for containerB and it does not reach the desired status within that time then containerA will give up and not start. This results in the task transitioning to a STOPPED state.",
      },
      {
        title: "Stop timeout",
        value: `${this.container.stopTimeout || "N/A"} seconds`,
        helpText:
          "Time duration to wait before the container is forcefully killed if it doesn't exit normally on its own.",
      },
      {
        title: "Hostname",
        value: this.container.hostname,
        helpText:
          "The hostname to use for your container. This parameter maps to Hostname in the Create a container section of the Docker Remote API and the --hostname option to docker run.",
      },
      {
        title: "User",
        value: this.container.user,
        helpText:
          "The user name to use inside the container. This parameter maps to User in the Create a container section of the Docker Remote API and the --user option to docker run.",
      },
      {
        title: "Working directory",
        value: this.container.workingDirectory,
        helpText:
          "The working directory in which to run commands inside the container. This parameter maps to WorkingDir in the Create a container section of the Docker Remote API and the --workdir option to docker run.",
        isCode: true,
      },
      {
        title: "Disable networking?",
        value: this.container.disableNetworking,
        helpText:
          "When this parameter is true, networking is disabled within the container. This parameter maps to NetworkDisabled in the Create a container section of the Docker Remote API.",
      },
      {
        title: "Is privileged?",
        value: this.container.privileged,
        helpText:
          "When this parameter is true, the container is given elevated privileges on the host container instance (similar to the root user). This parameter maps to Privileged in the Create a container section of the Docker Remote API and the --privileged option to docker run.",
      },
      {
        title: "Read only root file system?",
        value: this.container.readonlyRootFilesystem,
        helpText:
          "When this parameter is true, the container is given read-only access to its root file system. This parameter maps to ReadonlyRootfs in the Create a container section of the Docker Remote API and the --read-only option to docker run.",
      },
      {
        title: "Is interactive?",
        value: this.container.interactive,
        helpText:
          "When this parameter is true, this allows you to deploy containerized applications that require stdin or a tty to be allocated. This parameter maps to OpenStdin in the Create a container section of the Docker Remote API and the --interactive option to docker run.",
      },
      {
        title: "Pseudo terminal?",
        value: this.container.pseudoTerminal,
        helpText:
          "When this parameter is true, a TTY is allocated. This parameter maps to Tty in the Create a container section of the Docker Remote API and the --tty option to docker run.",
      },
      {
        title: "Repository credentials",
        value: this.container.repositoryCredentials?.credentialsParameter,
        helpText: "The private repository authentication credentials to use.",
      },
    ];
  }
}
</script>
