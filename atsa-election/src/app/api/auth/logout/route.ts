// Retired: polling-station voting no longer uses emails or credentials, and public results show no numbers.
const gone = () => new Response('Gone', { status: 410 });
export const GET = gone;
export const POST = gone;
