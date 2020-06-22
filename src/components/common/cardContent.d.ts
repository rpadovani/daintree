export interface CardContent {
  //The title of the card
  title: string;

  //The value to show. If undefined, the card will not appear, unless `showIfEmpty` is marked as true
  value?: string | number | boolean;
  showIfEmpty?: boolean;

  //Some explanation of the meaning of the content
  helpText?: string;

  //Is a region or a availability zone? Then it shows a flag
  isRegion?: boolean;
  isAz?: boolean;

  //If a component is over multiple availability zones, report them here
  azs?: string[];

  //Add a link to another page
  linkTo?: string;
  linksTo?: { to: string; text: string }[]; //Multiple links,
  // Show as code
  isCode?: boolean;

  //Show as a resource state
  isState?: boolean;

  //Show as a progress bar
  isProgress?: boolean;
}
