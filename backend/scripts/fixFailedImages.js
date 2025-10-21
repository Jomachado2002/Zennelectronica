const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const productModel = require('../models/productModel');

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq",
    authDomain: "eccomerce-jmcomputer.firebaseapp.com",
    projectId: "eccomerce-jmcomputer",
    storageBucket: "eccomerce-jmcomputer.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456789"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://josiasnicolas02:jOSIASMACHADO2010@cluster0.870vw.mongodb.net/Eccomercejm?retryWrites=true&w=majority&appName=Cluster0';

// Crear directorio temporal si no existe
const tempDir = path.join(__dirname, 'temp_webp_conversion');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function extractFirebasePath(url) {
    try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);
        if (pathMatch) {
            return decodeURIComponent(pathMatch[1]);
        }
        return null;
    } catch (error) {
        // console.log removed for production
        return null;
    }
}

async function convertSingleImage(imageUrl, productId, productName) {
    try {
        // console.log removed for production
        // console.log removed for production

        // Extraer path del archivo
        const firebasePath = extractFirebasePath(imageUrl);
        if (!firebasePath) {
            throw new Error('No se pudo extraer el path del archivo');
        }

        // console.log removed for production

        // Descargar imagen
        // console.log removed for production
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        // Generar nombre único para el archivo temporal
        const tempFileName = `${uuidv4()}.webp`;
        const tempFilePath = path.join(tempDir, tempFileName);

        // Convertir a WebP
        // console.log removed for production
        await sharp(response.data)
            .webp({ quality: 85 })
            .toFile(tempFilePath);

        // Subir a Firebase
        // console.log removed for production
        const fileBuffer = fs.readFileSync(tempFilePath);
        const newFileName = firebasePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const storageRef = ref(storage, newFileName);
        const snapshot = await uploadBytes(storageRef, fileBuffer);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // console.log removed for production

        // Eliminar archivo temporal
        fs.unlinkSync(tempFilePath);

        // Actualizar base de datos
        // console.log removed for production
        await productModel.updateOne(
            { _id: productId },
            { $set: { 'productImage.$[elem]': downloadURL } },
            { arrayFilters: [{ 'elem': imageUrl }] }
        );

        // console.log removed for production

        return {
            success: true,
            oldUrl: imageUrl,
            newUrl: downloadURL
        };

    } catch (error) {
        // console.log removed for production
        return {
            success: false,
            error: error.message
        };
    }
}

async function fixFailedImages() {
    try {
        // console.log removed for production
        
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        // console.log removed for production

        // Lista de imágenes que fallaron (obtenida del análisis anterior)
        const failedImages = [
            {
                productId: '67c637f419de273cdeb57512',
                productName: 'Mouse Gamer Corsair M65 Ultra USB / RGB - Negro (CH-9309411-NA2)',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2F800ec0cc-0e87-41e8-8332-8ee43dd7cd3f_rzwtnfz93cvtqppipvfi.jpg?alt=media&token=ececb2ef-0b75-473d-8955-b7e3524241be'
            },
            {
                productId: '67c637f419de273cdeb57512',
                productName: 'Mouse Gamer Corsair M65 Ultra USB / RGB - Negro (CH-9309411-NA2)',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2F4ab0d7af-699e-4c64-9147-f09bc8fddbb0_natgcr6pyfg5o7xiy8ug.jpg?alt=media&token=f4a22780-bc24-472f-8a03-12f96b494255'
            },
            {
                productId: '684afd2b80cc840977d9d860',
                productName: 'Memoria RAM Kingston Fury Beast DDR5 32GB (2x16GB) 5200MHz - Negro (KF552C40BBK2-32)',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2Faa5fb7b8-9b61-4b0c-89d5-5470c9837ea7_MEM-DDR5-64GB-5600MHZ-KINGSTON-FURY-BEAST-EXPO-PRETO-3.jpg?alt=media&token=c6e8b578-f894-4204-bda8-a4a18a0714d1'
            },
            {
                productId: '684afd2b80cc840977d9d860',
                productName: 'Memoria RAM Kingston Fury Beast DDR5 32GB (2x16GB) 5200MHz - Negro (KF552C40BBK2-32)',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2Fc401f840-c865-4dd9-8e42-54b13935720c_MEM-DDR5-64GB-5600MHZ-KINGSTON-FURY-BEAST-EXPO-PRETO-1.jpg?alt=media&token=a2ce9234-d138-4224-8ccb-b0cb2ebe3778'
            },
            {
                productId: '684afd2ed05765e2ae64ea03',
                productName: 'Memoria RAM Kingston Fury Beast DDR5 32GB (2x16GB) 5200MHz - Negro (KF552C40BBK2-32)',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2F92bd66da-7379-4e3c-9337-d7f322da4e6c_MEM-DDR5-64GB-5600MHZ-KINGSTON-FURY-BEAST-EXPO-PRETO-2.jpg?alt=media&token=ba34981b-3800-43a1-8d44-95d53cd7c5d1'
            },
            {
                productId: '686836ca497b289c7eccd8f7',
                productName: 'Reloj Inteligente Samsung Galaxy Watch4 Classic SM-R890 - Plata',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2F1f9c04d0-bd67-4e93-bca0-44d720ce1581_RELOGIO_INTELIGENTE_SAMSUNG_GALAXY_WATCH4_CLASSIC_SM-R890_PRATA_3.jpg?alt=media&token=f213e0ad-501e-443f-8174-7a231d5dc183'
            },
            {
                productId: '686836ca0456efa557655e19',
                productName: 'Reloj Inteligente Samsung Galaxy Watch4 Classic SM-R890 - Plata',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2Fe785654a-a03b-41b9-8fa5-a11ce1126023_RELOGIO_INTELIGENTE_SAMSUNG_GALAXY_WATCH4_CLASSIC_SM-R890_PRATA_1.jpg?alt=media&token=89a74afe-8748-4fb9-b1c1-1206578f4b58'
            },
            {
                productId: '686836ca0456efa557655e19',
                productName: 'Reloj Inteligente Samsung Galaxy Watch4 Classic SM-R890 - Plata',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-bluetec-saopaulo/o/products%2Ffdc14913-385e-4729-95c9-b248e76db05e_RELOGIO_INTELIGENTE_SAMSUNG_GALAXY_WATCH4_CLASSIC_SM-R890_PRATA_2.jpg?alt=media&token=00541b81-020f-4a96-b431-6e8701f3cc75'
            },
            {
                productId: '689b871575157669f33cbe0c',
                productName: 'Monitor Samsung LS27D300GAN 27 FHD IPS 100Hz  5Ms - Negro',
                imageUrl: 'https://firebasestorage.googleapis.com/v0/b/eccomerce-jmcomputer.firebasestorage.app/o/products%2F8c1fab53-12ea-4219-a9f5-d522a964bd6c_MONIT._LED_21.5_SAMSUNG_LS22D300GAN_FHD_PRETO_1.jpg?alt=media&token=2d63d255-2c10-4944-8caf-74775d746d63'
            }
        ];

        // console.log removed for production

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < failedImages.length; i++) {
            const failedImage = failedImages[i];
            // console.log removed for production
            
            const result = await convertSingleImage(
                failedImage.imageUrl,
                failedImage.productId,
                failedImage.productName
            );

            if (result.success) {
                successCount++;
                // console.log removed for production
            } else {
                errorCount++;
                // console.log removed for production
            }

            // Pausa entre conversiones
            if (i < failedImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // console.log removed for production
        // console.log removed for production
        // console.log removed for production
        // console.log removed for production

    } catch (error) {
        // console.error removed for production
    } finally {
        await mongoose.disconnect();
        // console.log removed for production
    }
}

fixFailedImages();


