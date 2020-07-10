//Generate a client token to ensure request idempotency.
//See https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Run_Instance_Idempotency.html
//Copied from https://stackoverflow.com/a/60014449/2586392
export function generateClientToken(): string {
  return [...Array(30)].map(() => Math.random().toString(36)[2]).join("");
}
