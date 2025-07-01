
import React, { useState } from "react";
import StatusFeed from "../components/StatusFeed";
import NavBar from "@/components/NavBar";

const StatusPage: React.FC = () => {
  return (
    <div className="container max-w-md mx-auto p-0 pb-20 bg-white">
      <StatusFeed />
      <NavBar />
    </div>
  );
};

export default StatusPage;
