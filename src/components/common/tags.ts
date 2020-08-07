import { TagList } from "aws-sdk/clients/ec2";

export function extractNameFromEC2Tags(
  tags: TagList | undefined
): string | undefined {
  if (!tags) {
    return "";
  }

  const nameTag = tags.filter((v) => v.Key === "Name");

  if (nameTag.length > 0) {
    return nameTag[0].Value;
  }

  return "";
}
