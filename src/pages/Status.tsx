
import React from "react";
import StatusFeed from "../components/StatusFeed";
import NavBar from "@/components/NavBar";

const StatusPage: React.FC = () => {
  return (
    <div className="container max-w-md mx-auto p-0 pb-20 bg-background min-h-screen">
      <StatusFeed />
      <NavBar />
    </div>
  );
};

export default StatusPage;
