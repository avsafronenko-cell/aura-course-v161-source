"use client";

import CourseClient from "./course/CourseClient";

export const dynamic = "force-dynamic";

export default function Home() {
  return <CourseClient initialUser={null} initialScreen="landing" />;
}
