import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}