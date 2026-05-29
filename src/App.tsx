import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./views/Dashboard";
import { Initiatives } from "./views/Initiatives";
import { InitiativeDetail } from "./views/InitiativeDetail";
import { Projects } from "./views/Projects";
import { ProjectDetail } from "./views/ProjectDetail";
import { Mailbox } from "./views/Mailbox";
import { CalendarView } from "./views/Calendar";
import { Imagine } from "./views/Imagine";
import { Roadmap } from "./views/Roadmap";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="initiatives" element={<Initiatives />} />
          <Route path="initiatives/:id" element={<InitiativeDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="mailbox" element={<Mailbox />} />
          <Route path="imagine" element={<Imagine />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
