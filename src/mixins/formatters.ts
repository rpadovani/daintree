import { TagList } from "aws-sdk/clients/ec2";
import moment from "moment";
import { Component, Vue } from "vue-property-decorator";

@Component({
  filters: {
    standardDate(date: Date): string {
      moment.locale();
      return moment(date).format("lll");
    },

    standardDateFromUnixSecondsString(unix: string): string {
      const toNumber = parseInt(unix, 10);
      moment.locale();
      return moment(toNumber * 1000).format("lll");
    },
  },
})
export class Formatters extends Vue {
  standardDate(date: Date): string {
    moment.locale();
    return moment(date).format("lll");
  }

  extractNameFromTags(tags: TagList): string | undefined {
    const nameTag = tags.filter((v) => v.Key === "Name");

    if (nameTag.length > 0) {
      return nameTag[0].Value;
    }

    return "";
  }
}
