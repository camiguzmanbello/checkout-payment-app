// Departamentos de Colombia con sus municipios principales. La lista existe
// para que ciudad y departamento se elijan, nunca se escriban: así no entran
// a la base de datos nombres mal escritos, abreviados o inventados.
export const DEPARTMENTS = {
  Amazonas: ['Leticia', 'Puerto Nariño'],
  Antioquia: [
    'Medellín',
    'Bello',
    'Itagüí',
    'Envigado',
    'Apartadó',
    'Rionegro',
    'Turbo',
    'Sabaneta',
    'Caucasia',
  ],
  Arauca: ['Arauca', 'Saravena', 'Tame'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'],
  Bolívar: ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar'],
  Boyacá: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
  Caldas: ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría'],
  Caquetá: ['Florencia', 'San Vicente del Caguán'],
  Casanare: ['Yopal', 'Aguazul', 'Villanueva'],
  Cauca: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
  Cesar: ['Valledupar', 'Aguachica', 'Agustín Codazzi'],
  Chocó: ['Quibdó', 'Istmina', 'Riosucio'],
  Córdoba: ['Montería', 'Lorica', 'Cereté', 'Sahagún'],
  Cundinamarca: [
    'Bogotá D.C.',
    'Soacha',
    'Chía',
    'Zipaquirá',
    'Facatativá',
    'Fusagasugá',
    'Girardot',
    'Mosquera',
    'Madrid',
    'Cajicá',
    'Funza',
  ],
  Guainía: ['Inírida'],
  Guaviare: ['San José del Guaviare'],
  Huila: ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Fonseca'],
  Magdalena: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'],
  Meta: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López'],
  Nariño: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Pamplona'],
  Putumayo: ['Mocoa', 'Puerto Asís', 'Orito'],
  Quindío: ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya'],
  Risaralda: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'],
  Sucre: ['Sincelejo', 'Corozal', 'Sampués'],
  Tolima: ['Ibagué', 'Espinal', 'Melgar', 'Honda'],
  'Valle del Cauca': [
    'Cali',
    'Palmira',
    'Buenaventura',
    'Tuluá',
    'Cartago',
    'Buga',
    'Jamundí',
    'Yumbo',
  ],
  Vaupés: ['Mitú'],
  Vichada: ['Puerto Carreño'],
};

export const DEPARTMENT_NAMES = Object.keys(DEPARTMENTS).sort((a, b) =>
  a.localeCompare(b, 'es'),
);

export function citiesOf(department) {
  return DEPARTMENTS[department] ?? [];
}

export function isValidDepartment(department) {
  return Object.prototype.hasOwnProperty.call(DEPARTMENTS, department);
}

export function isValidCity(department, city) {
  return citiesOf(department).includes(city);
}
