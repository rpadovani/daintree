import { TagList } from "aws-sdk/clients/ec2";
import { Component, Vue } from "vue-property-decorator";

export function standardDate(date: Date): string {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
}

export function standardDateFromUnixSecondsString(unix: string): string {
  const toNumber = parseInt(unix, 10);

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  };
  return new Date(toNumber * 1000).toLocaleDateString(undefined, options);
}

@Component({
  filters: {
    standardDate(date: Date): string {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      };
      return date.toLocaleDateString(undefined, options);
    },

    standardDateFromUnixSecondsString(unix: string): string {
      const toNumber = parseInt(unix, 10);

      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      };
      return new Date(toNumber * 1000).toLocaleDateString(undefined, options);
    },
  },
})
export class Formatters extends Vue {
  standardDate(date: Date): string {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  }

  extractNameFromTags(tags: TagList): string | undefined {
    const nameTag = tags.filter((v) => v.Key === "Name");

    if (nameTag.length > 0) {
      return nameTag[0].Value;
    }

    return "";
  }
}
