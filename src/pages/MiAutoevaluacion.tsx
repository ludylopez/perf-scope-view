import { Navigate } from "react-router-dom";

const MiAutoevaluacion = () => {
  return (
    <Navigate
      to="/dashboard"
      replace
      state={{ focusResultados: true }}
    />
  );
};

export default MiAutoevaluacion;

