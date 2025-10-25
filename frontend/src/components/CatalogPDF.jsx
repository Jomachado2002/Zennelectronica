import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

// Estilos elegantes para el PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerSubtext: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 8,
  },
  subcategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 10,
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    borderRightStyle: 'solid',
  },
  tableCellNumber: {
    width: '8%',
    textAlign: 'center',
  },
  tableCellProduct: {
    width: '50%',
  },
  tableCellCode: {
    width: '20%',
  },
  tableCellPrice: {
    width: '22%',
    textAlign: 'right',
    color: '#059669',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
  indexPage: {
    padding: 40,
  },
  indexTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 30,
    textAlign: 'center',
  },
  indexCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    marginTop: 20,
  },
  indexSubcategory: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 20,
    marginBottom: 5,
  },
  coverPage: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 40,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 20,
    color: '#6b7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  coverLine: {
    width: 200,
    height: 3,
    backgroundColor: '#2563eb',
    marginBottom: 30,
  },
  coverInfo: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 1.6,
  },
});

// Componente para la portada
const CoverPage = ({ companyName }) => (
  <Page size="A4" style={styles.coverPage}>
    <Text style={styles.coverTitle}>Catálogo de Productos</Text>
    <Text style={styles.coverSubtitle}>Electrónica y Tecnología</Text>
    <View style={styles.coverLine} />
    <Text style={styles.coverInfo}>
      {companyName}
      {'\n\n'}
      📧 info@zenn.com.py
      {'\n'}
      📞 +595 21 123-4567
      {'\n'}
      📍 Asunción, Paraguay
      {'\n\n'}
      Generado el {new Date().toLocaleDateString('es-PY')}
    </Text>
  </Page>
);

// Componente para el índice
const IndexPage = ({ catalogData }) => (
  <Page size="A4" style={styles.indexPage}>
    <View style={styles.header}>
      <Text style={styles.headerText}>Índice de Categorías</Text>
    </View>
    
    <Text style={styles.indexTitle}>Contenido del Catálogo</Text>
    
    {catalogData.map((category, categoryIndex) => (
      <View key={categoryIndex}>
        <Text style={styles.indexCategory}>
          {categoryIndex + 1}. {category.categoria}
        </Text>
        {category.subcategorias?.map((subcategory, subIndex) => (
          <Text key={subIndex} style={styles.indexSubcategory}>
            • {subcategory.name} ({subcategory.productos?.length || 0} productos)
          </Text>
        ))}
      </View>
    ))}
  </Page>
);

// Componente para las tablas de productos
const ProductTable = ({ subcategory }) => {
  const products = subcategory.productos || [];
  
  if (products.length === 0) {
    return (
      <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
        No hay productos disponibles en esta subcategoría
      </Text>
    );
  }

  return (
    <View style={styles.table}>
      {/* Header de la tabla */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCell, styles.tableCellNumber]}>N°</Text>
        <Text style={[styles.tableCell, styles.tableCellProduct]}>Producto</Text>
        <Text style={[styles.tableCell, styles.tableCellCode]}>Código</Text>
        <Text style={[styles.tableCell, styles.tableCellPrice]}>Precio</Text>
      </View>
      
      {/* Filas de productos */}
      {products.map((product, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellNumber]}>
            {index + 1}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellProduct]}>
            {product.titulo || 'Sin título'}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellCode]}>
            {product.codigo || '-'}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellPrice]}>
            Gs. {(product.precio || 0).toLocaleString('es-PY')}
          </Text>
        </View>
      ))}
    </View>
  );
};

// Componente principal del documento PDF
const CatalogDocument = ({ catalogData, companyName }) => (
  <Document>
    {/* Portada */}
    <CoverPage companyName={companyName} />
    
    {/* Índice */}
    <IndexPage catalogData={catalogData} />
    
    {/* Contenido por categorías */}
    {catalogData.map((category, categoryIndex) => (
      <Page key={categoryIndex} size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{category.categoria}</Text>
          <Text style={styles.headerSubtext}>
            {category.subcategorias?.length || 0} subcategorías
          </Text>
        </View>
        
        {category.subcategorias?.map((subcategory, subIndex) => (
          <View key={subIndex} style={styles.section}>
            <Text style={styles.subcategoryTitle}>
              {subcategory.name}
            </Text>
            <ProductTable subcategory={subcategory} />
          </View>
        ))}
        
        <Text style={styles.footer}>
          © {new Date().getFullYear()} {companyName} | 
          Generado el {new Date().toLocaleDateString('es-PY')} | 
          Página {categoryIndex + 3}
        </Text>
      </Page>
    ))}
  </Document>
);

// Componente principal que maneja la descarga
const CatalogPDF = ({ catalogData, companyName = 'Zenn Electrónica' }) => {
  const fileName = `catalogo-${companyName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  
  return (
    <PDFDownloadLink
      document={<CatalogDocument catalogData={catalogData} companyName={companyName} />}
      fileName={fileName}
      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
    >
      {({ blob, url, loading, error }) => (
        <div className="flex items-center space-x-2">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generando PDF...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar Catálogo PDF</span>
            </>
          )}
        </div>
      )}
    </PDFDownloadLink>
  );
};

export default CatalogPDF;
