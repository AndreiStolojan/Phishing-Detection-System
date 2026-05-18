import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
    const user = auth.currentUser; // Preluăm utilizatorul curent de la Firebase

    return user ? children : <Navigate to="/" />;
};

export default ProtectedRoute;