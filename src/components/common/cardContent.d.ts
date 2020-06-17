export interface CardContent {
  title: string;
  value?: string | number | boolean;
  isRegion?: boolean;
  linkTo?: string;
  isAz?: boolean;
  helpText?: string;
  isCode?: boolean;
  showIfEmpty?: boolean;
}
