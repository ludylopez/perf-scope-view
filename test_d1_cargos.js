const cargos = [
  'Gerente Municipal',
  'Juez de Asuntos Municipales y de Tránsito',
  'Directora de la Dirección de Recursos Humanos',
  'Directora de la Dirección Municipal de Planificación',
  'Director Financiero de la Dirección de Administración Integrada Municipal',
  'Directora de la Oficina de la Dirección  Municipal de la Mujer' // Nota: tiene doble espacio
];

const getD1PuestoType = (cargo) => {
  if (!cargo) return null;
  
  const cargoNormalized = cargo.toLowerCase().trim().replace(/\s+/g, " ");
  
  if (cargoNormalized.includes("gerente municipal") && !cargoNormalized.includes("sub")) {
    return "gerente";
  }
  if (cargoNormalized.includes("juez") && 
      (cargoNormalized.includes("asuntos municipales") || cargoNormalized.includes("tránsito") || cargoNormalized.includes("transito"))) {
    return "juez";
  }
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      cargoNormalized.includes("recursos humanos")) {
    return "rrhh";
  }
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      (cargoNormalized.includes("planificación") || cargoNormalized.includes("planificacion"))) {
    return "dmp";
  }
  if (cargoNormalized.includes("financiero") && 
      (cargoNormalized.includes("administración integrada") || cargoNormalized.includes("administracion integrada") || cargoNormalized.includes("dafim"))) {
    return "dafim";
  }
  if ((cargoNormalized.includes("director") || cargoNormalized.includes("directora")) && 
      cargoNormalized.includes("mujer")) {
    return "dmm";
  }
  
  return null;
};

console.log('=== VERIFICACIÓN DE CARGOS D1 EN BD ===\n');
cargos.forEach(cargo => {
  const tipo = getD1PuestoType(cargo);
  console.log(tipo ? `✅ ${cargo}\n   → ${tipo}` : `❌ ${cargo}\n   → SIN MATCH`);
});

console.log('\n=== ESCENARIOS SIN MATCH ===');
console.log('Si no hay match, el usuario verá:');
console.log('  - Los 3 items universales de la dimensión 3 (d3_i1_d1, d3_i2_d1, d3_i3_d1)');
console.log('  - NO verá los 2 items específicos');
console.log('  - Total: 5 items en dimensión 3 (en lugar de 5)');
console.log('\nEsto podría pasar si:');
console.log('  1. Se agrega un nuevo cargo D1 que no esté en el mapeo');
console.log('  2. Hay un error de tipeo en el nombre del cargo');
console.log('  3. Se cambia el nombre de un cargo y no se actualiza el mapeo');

