import EditionView from "../edition-view";
import { dailyRun } from "../content";

export const metadata = { title: "今日简报" };

export default function DailyPage() {
  return <EditionView run={dailyRun} />;
}
