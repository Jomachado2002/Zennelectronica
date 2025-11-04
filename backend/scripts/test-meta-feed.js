// Script de prueba para el feed XML de Meta Ads
// Ejecutar con: node backend/scripts/test-meta-feed.js

const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo
const ProductModel = require('../models/productModel');

async function testMetaFeed() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zenn');
        console.log('✅ Conectado a MongoDB\n');
        
        // Query igual al del controlador
        const query = {
            productImage: { 
                $exists: true, 
                $ne: [], 
                $not: { $size: 0 } 
            },
            productName: { 
                $exists: true, 
                $ne: '' 
            },
            $or: [
                { price: { $gte: 1 } },
                { sellingPrice: { $gte: 1 } }
            ],
            slug: { 
                $exists: true, 
                $ne: '' 
            },
            $and: [
                {
                    $or: [
                        { stock: { $gte: 1 } },
                        { stockStatus: 'in_stock' },
                        { stockStatus: 'low_stock', stock: { $gt: 0 } },
                        { stock: { $exists: false } }
                    ]
                }
            ]
        };
        
        // Obtener productos
        const products = await ProductModel
            .find(query)
            .select('productName brandName category subcategory productImage price sellingPrice codigo stock stockStatus slug')
            .sort({ updatedAt: -1 })
            .lean();
        
        console.log('📊 RESUMEN DEL FEED\n');
        console.log(`Total de productos con stock: ${products.length}`);
        
        if (products.length === 0) {
            console.log('\n⚠️  No se encontraron productos con stock.');
            console.log('Verifica que tus productos tengan:');
            console.log('  - stock > 0 o stockStatus = "in_stock"');
            console.log('  - Al menos una imagen');
            console.log('  - Nombre y slug válidos');
            console.log('  - Precio mayor a 1\n');
            process.exit(0);
        }
        
        // Análisis por categoría
        const categoryCounts = {};
        products.forEach(p => {
            const cat = p.category || 'Sin categoría';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        
        console.log('\n📁 PRODUCTOS POR CATEGORÍA:\n');
        Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, count]) => {
                console.log(`  ${cat}: ${count} productos`);
            });
        
        // Verificar campos requeridos
        console.log('\n🔍 VERIFICACIÓN DE CAMPOS REQUERIDOS:\n');
        
        let withImages = 0;
        let withBrand = 0;
        let withPrice = 0;
        let withSlug = 0;
        let withCode = 0;
        let withCategory = 0;
        
        products.forEach(p => {
            if (p.productImage && p.productImage.length > 0) withImages++;
            if (p.brandName) withBrand++;
            if (p.sellingPrice > 0) withPrice++;
            if (p.slug) withSlug++;
            if (p.codigo) withCode++;
            if (p.category && p.subcategory) withCategory++;
        });
        
        console.log(`  ✅ Con imágenes: ${withImages}/${products.length} (${Math.round(withImages/products.length*100)}%)`);
        console.log(`  ✅ Con marca: ${withBrand}/${products.length} (${Math.round(withBrand/products.length*100)}%)`);
        console.log(`  ✅ Con precio válido: ${withPrice}/${products.length} (${Math.round(withPrice/products.length*100)}%)`);
        console.log(`  ✅ Con slug: ${withSlug}/${products.length} (${Math.round(withSlug/products.length*100)}%)`);
        console.log(`  ⚪ Con código: ${withCode}/${products.length} (${Math.round(withCode/products.length*100)}%)`);
        console.log(`  ✅ Con categoría completa: ${withCategory}/${products.length} (${Math.round(withCategory/products.length*100)}%)`);
        
        // Muestra de productos
        console.log('\n📦 MUESTRA DE PRODUCTOS (primeros 5):\n');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`${i + 1}. ${p.productName}`);
            console.log(`   Marca: ${p.brandName || 'N/A'}`);
            console.log(`   Categoría: ${p.category || 'N/A'} > ${p.subcategory || 'N/A'}`);
            console.log(`   Precio: ${p.sellingPrice} PYG`);
            console.log(`   Stock: ${p.stock !== undefined ? p.stock : 'N/A'}`);
            console.log(`   Imágenes: ${p.productImage?.length || 0}`);
            console.log(`   Slug: ${p.slug || 'N/A'}`);
            console.log(`   URL: https://zenn.com.py/producto/${p.slug}`);
            console.log('');
        });
        
        // Verificar estructura del XML
        console.log('\n🔧 GENERANDO XML DE PRUEBA...\n');
        
        const testProduct = products[0];
        const xmlSample = `<item>
    <g:id>${testProduct._id}</g:id>
    <g:title>${testProduct.productName}</g:title>
    <g:link>https://zenn.com.py/producto/${testProduct.slug}</g:link>
    <g:image_link>${testProduct.productImage[0]}</g:image_link>
    <g:brand>${testProduct.brandName || 'Zenn'}</g:brand>
    <g:condition>new</g:condition>
    <g:availability>in stock</g:availability>
    <g:price>${testProduct.sellingPrice} PYG</g:price>
    <g:product_type>${testProduct.category} > ${testProduct.subcategory}</g:product_type>
</item>`;
        
        console.log('Ejemplo de XML para el primer producto:');
        console.log(xmlSample);
        
        // URLs del feed
        console.log('\n🌐 URLs DEL FEED XML:\n');
        console.log('  Producción: https://zenn.com.py/api/meta-catalog.xml');
        console.log('  Alias:      https://zenn.com.py/api/facebook-catalog.xml');
        console.log('  Local:      http://localhost:8080/api/meta-catalog.xml\n');
        
        // Recomendaciones
        console.log('💡 RECOMENDACIONES:\n');
        
        if (withBrand < products.length) {
            console.log(`  ⚠️  ${products.length - withBrand} productos sin marca. Agregar brandName mejora el SEO.`);
        }
        
        if (withCode < products.length * 0.5) {
            console.log(`  ⚠️  Menos del 50% de productos tienen código. Considera agregarlo para mejor tracking.`);
        }
        
        if (withCategory < products.length) {
            console.log(`  ⚠️  ${products.length - withCategory} productos sin categoría completa.`);
        }
        
        const avgImages = products.reduce((sum, p) => sum + (p.productImage?.length || 0), 0) / products.length;
        if (avgImages < 3) {
            console.log(`  💡 Promedio de ${avgImages.toFixed(1)} imágenes por producto. Meta recomienda 3-5 imágenes.`);
        }
        
        console.log('\n✅ TEST COMPLETADO\n');
        console.log('Próximos pasos:');
        console.log('  1. Accede a https://zenn.com.py/api/meta-catalog.xml');
        console.log('  2. Verifica que el XML se genera correctamente');
        console.log('  3. Copia la URL y pégala en Meta Commerce Manager');
        console.log('  4. Configura actualización automática cada 4-12 horas');
        console.log('  5. Revisa diagnósticos en Meta para confirmar');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar test
testMetaFeed();


