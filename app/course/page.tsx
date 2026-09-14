import { requireChatGPTUser } from "../chatgpt-auth";
import CourseClient from "./CourseClient";

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const user = await requireChatGPTUser("/course");

  return (
    <CourseClient
      initialUser={{ displayName: user.displayName, email: user.email }}
    />
  );
}
