import React from "react";
import { Button, Typography, Box } from "@mui/material";

const WaitingForVerification = ({ user, handleLogout }) => {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100vh"
            bgcolor="#121212"
        >
            <Typography
                variant="h5"
                color="white"
                sx={{ mb: 3, textAlign: "center" }}
            >
                Te rugăm să îți verifici email-ul la adresa: {user.email}.
            </Typography>
            <Typography
                variant="body1"
                color="#ECECEC"
                sx={{ mb: 3, textAlign: "center" }}
            >
                Accesează link-ul de confirmare trimis pe email pentru a-ți activa contul.
            </Typography>
            <Button
                variant="contained"
                onClick={handleLogout}
                sx={{ mt: 3, borderRadius: "8px" }}
            >
                Mergi la pagina de logare!
            </Button>
        </Box>
    );
};

export default WaitingForVerification;