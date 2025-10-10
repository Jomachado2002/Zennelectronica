import React, { useState, useEffect } from 'react';
import { IoIosClose, IoMdTrash } from "react-icons/io";
import productCategory from '../helpers/productCategory';
import { FaUpload } from "react-icons/fa";
import uploadImage from '../helpers/uploadImage';
import DisplayImage from './DisplayImage';
import { FaDeleteLeft } from "react-icons/fa6";
import SummaryApi from '../common';
import { toast } from 'react-toastify';
import ProductSpecifications from './ProductSpecifications';

const AdminEditProduct = ({
    onClose,
    productData,
    fetchdata
}) => {
    // Inicializar datos con un objeto vacío para cada posible campo de especificación
    const initialData = {
        // Datos básicos del producto
        productName: productData?.productName || "",
        brandName: productData?.brandName || "",
        category: productData?.category || "",
        subcategory: productData?.subcategory || "",
        productImage: productData?.productImage || [],
        documentationLink: productData?.documentationLink || "",
        description: productData?.description || "",
        price: productData?.price || "",
        sellingPrice: productData?.sellingPrice || "",
        stock: productData?.stock || 0,
        isVipOffer: productData?.isVipOffer || false,
        // ✅ NUEVO CAMPO: CÓDIGO DEL PRODUCTO
        codigo: productData?.codigo || "",
        
        // Campos específicos por categoría inicializados con valores del productData
        // (resto de campos como en el código original)
        // Se han omitido por brevedad, pero incluirías todos los campos del código original
    };

    const [data, setData] = useState(initialData);
    const [openFullScreenImage, setOpenFullScreenImage] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Efecto para cargar todos los campos del producto desde productData
    useEffect(() => {
        if (productData) {
            // Asegurarse de que todos los campos sean incluidos
            setData({
                ...initialData,
                ...productData
            });
        }
    }, [productData]);

    const handleOnChange = (e) => {
        const { name, value, type } = e.target;
        setData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleUploadProduct = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const uploadPromises = [];
        const maxImages = 10;
        const remainingSlots = maxImages - data.productImage.length;

        if (files.length + data.productImage.length > maxImages) {
            toast.warning(`Solo se pueden cargar hasta ${maxImages} imágenes en total`);
        }

        const filesToUpload = files.slice(0, remainingSlots);

        try {
            for (const file of filesToUpload) {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`La imagen ${file.name} excede el límite de 5MB`);
                    continue;
                }

                if (!file.type.startsWith('image/')) {
                    toast.error(`El archivo ${file.name} no es una imagen válida`);
                    continue;
                }

                const uploadPromise = uploadImage(file)
                    .then(response => response.url)
                    .catch(error => {
                        console.error(`Error al cargar ${file.name}:`, error);
                        return null;
                    });

                uploadPromises.push(uploadPromise);
            }

            const uploadedUrls = await Promise.all(uploadPromises);
            const validUrls = uploadedUrls.filter(url => url !== null);

            if (validUrls.length > 0) {
                setData(prev => ({
                    ...prev,
                    productImage: [...prev.productImage, ...validUrls]
                }));
                toast.success(`${validUrls.length} ${validUrls.length === 1 ? 'imagen cargada' : 'imágenes cargadas'} exitosamente`);
            }
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            toast.error("Error al cargar las imágenes");
        } finally {
            e.target.value = null;
        }
    };

    const handleDeleteProductImage = (index) => {
        const newProductImage = [...data.productImage];
        newProductImage.splice(index, 1);
        setData(prev => ({
            ...prev,
            productImage: newProductImage
        }));
        toast.success('Imagen eliminada correctamente');
    };

    const handleDeleteProduct = async () => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
            setIsDeleting(true);
            try {
                const response = await fetch(SummaryApi.deleteProductController.url, {
                    method: SummaryApi.deleteProductController.method,
                    credentials: 'include',
                    headers: {
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({ productId: productData._id })
                });

                const responseData = await response.json();
                if (responseData.success) {
                    toast.success("Producto eliminado correctamente");
                    onClose();
                    fetchdata();
                } else {
                    toast.error(responseData?.message || "Error al eliminar el producto");
                }
            } catch (error) {
                toast.error("Error de conexión al eliminar el producto");
                console.error(error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!data.productName || !data.brandName || !data.category || !data.subcategory || !data.codigo) {
            toast.error("Por favor, complete todos los campos requeridos (incluyendo el código)");
            return;
        }

        if (data.productImage.length === 0) {
            toast.error("Por favor, cargue al menos una imagen del producto");
            return;
        }

        try {
            const response = await fetch(SummaryApi.updateProduct.url, {
                method: SummaryApi.updateProduct.method,
                credentials: 'include',
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();
            if (responseData.success) {
                toast.success(responseData?.message);
                onClose();
                fetchdata();
            } else {
                toast.error(responseData?.message || "Error al actualizar el producto");
            }
        } catch (error) {
            toast.error("Error de conexión al actualizar el producto");
            console.error(error);
        }
    };

    // Función para obtener el nombre de la subcategoría actual
    const getCurrentSubcategoryLabel = () => {
        const category = productCategory.find(cat => cat.value === data.category);
        if (!category) return 'Producto';
        
        const subcategory = category.subcategories.find(subcat => subcat.value === data.subcategory);
        return subcategory ? subcategory.label : 'Producto';
    };

    return (
        <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 overflow-y-auto'>
            <div className='bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col'>
                {/* Encabezado */}
                <div className='flex justify-between items-center p-4 border-b'>
                    <h2 className='font-bold text-xl text-gray-800 flex items-center'>
                        <span className='mr-3'>Editar Producto</span>
                        <button 
                            onClick={handleDeleteProduct}
                            disabled={isDeleting}
                            className='text-red-600 hover:text-red-800 transition-colors duration-300 
                                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
                            title='Eliminar Producto'
                        >
                            <IoMdTrash className='text-2xl' />
                        </button>
                    </h2>
                    <button 
                        className='text-3xl text-gray-600 hover:text-black transition-colors duration-300' 
                        onClick={onClose}
                    >
                        <IoIosClose />
                    </button>
                </div>

                {/* Formulario con scroll interno */}
                <form 
                    onSubmit={handleSubmit} 
                    className='grid grid-cols-2 gap-4 p-4 overflow-y-auto flex-grow'
                >
                    {/* Columna Izquierda */}
                    <div className='space-y-4'>
                        <div>
                            <label htmlFor='productName' className='block text-sm font-medium text-gray-700 mb-1'>
                                Nombre del Producto
                            </label>
                            <input
                                type='text'
                                id='productName'
                                name='productName'
                                value={data.productName}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder='Ingresa el nombre del producto'
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor='brandName' className='block text-sm font-medium text-gray-700 mb-1'>
                                Marca
                            </label>
                            <input
                                type='text'
                                id='brandName'
                                name='brandName'
                                value={data.brandName}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder='Ingresa la marca'
                                required
                            />
                        </div>

                        {/* ✅ NUEVO CAMPO: CÓDIGO DEL PRODUCTO */}
                        <div>
                            <label htmlFor='codigo' className='block text-sm font-medium text-gray-700 mb-1'>
                                Código del Producto
                            </label>
                            <input
                                type='text'
                                id='codigo'
                                name='codigo'
                                value={data.codigo}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder='Ej: NB-001, MO-002, etc.'
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor='category' className='block text-sm font-medium text-gray-700 mb-1'>
                                Categoría
                            </label>
                            <select
                                id='category'
                                name='category'
                                value={data.category}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                required
                            >
                                <option value="">Selecciona una categoría</option>
                                {productCategory.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {data.category && (
                            <div>
                                <label htmlFor='subcategory' className='block text-sm font-medium text-gray-700 mb-1'>
                                    Subcategoría
                                </label>
                                <select
                                    id='subcategory'
                                    name='subcategory'
                                    value={data.subcategory}
                                    onChange={handleOnChange}
                                    className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                               transition-all duration-300'
                                    required
                                >
                                    <option value="">Selecciona una subcategoría</option>
                                    {(productCategory.find(cat => cat.value === data.category)?.subcategories || []).map(subcat => (
                                        <option key={subcat.value} value={subcat.value}>{subcat.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label htmlFor='price' className='block text-sm font-medium text-gray-700 mb-1'>
                                Precio
                            </label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={data.price}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder="Ingresa el precio"
                                required
                            />
                        </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className='space-y-4'>
                        <div>
                            <label htmlFor="description" className='block text-sm font-medium text-gray-700 mb-1'>
                                Descripción del Producto
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={data.description}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300 h-32 resize-none'
                                placeholder="Ingresa la descripción del producto"
                            ></textarea>
                        </div>

                        <div>
                            <label htmlFor="sellingPrice" className='block text-sm font-medium text-gray-700 mb-1'>
                                Precio de Venta
                            </label>
                            <input
                                type="number"
                                id="sellingPrice"
                                name="sellingPrice"
                                value={data.sellingPrice}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder="Ingresa el precio de venta"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="documentationLink" className='block text-sm font-medium text-gray-700 mb-1'>
                                Enlace de Documentación (Opcional)
                            </label>
                            <input
                                type="text"
                                id="documentationLink"
                                name="documentationLink"
                                value={data.documentationLink}
                                onChange={handleOnChange}
                                className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                           transition-all duration-300'
                                placeholder="Ingresa el enlace de documentación"
                                />
                                </div>
                                <div>
                                <label htmlFor="stock" className='block text-sm font-medium text-gray-700 mb-1'>
                                    Stock
                                </label>
                                <input
                                    type="number"
                                    id="stock"
                                    name="stock"
                                    value={data.stock}
                                    onChange={handleOnChange}
                                    className='w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg 
                                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                            transition-all duration-300'
                                    placeholder="Cantidad en stock"
                                    min="0"
                                />
                                </div>
                                <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isVipOffer"
                                    name="isVipOffer"
                                    checked={data.isVipOffer}
                                    onChange={(e) => setData(prev => ({...prev, isVipOffer: e.target.checked}))}
                                    className="mr-2"
                                />
                                <label htmlFor="isVipOffer" className='text-sm font-medium text-gray-700'>
                                    Marcar como Oferta VIP
                                </label>
                                </div>
        
                                {/* Sección de Imágenes */}
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                                        Imágenes del Producto ({data.productImage.length}/10)
                                    </label>
                                    <label 
                                        htmlFor="uploadImageInput" 
                                        className='block'
                                    >
                                        <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 
                                                        rounded-lg text-center cursor-pointer 
                                                        hover:border-blue-500 transition-all duration-300">
                                            <div className="text-gray-500 flex justify-center items-center flex-col gap-2">
                                                <FaUpload className='text-4xl text-gray-400' />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">
                                                        Cargar Imágenes del Producto
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Selecciona múltiples imágenes (máx. 10 imágenes, 5MB c/u)
                                                    </p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    id="uploadImageInput" 
                                                    className="hidden" 
                                                    onChange={handleUploadProduct}
                                                    multiple
                                                    accept="image/*"
                                                    disabled={data.productImage.length >= 10}
                                                />
                                            </div>
                                        </div>
                                    </label>
        
                                    {/* Galería de Imágenes */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                                        {data?.productImage.map((el, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <img
                                                    src={el}
                                                    alt={`Producto ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-lg 
                                                             border border-gray-200 cursor-pointer
                                                             hover:shadow-lg transition-all duration-300"
                                                    onClick={() => {
                                                        setOpenFullScreenImage(true);
                                                        setFullScreenImage(el);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white 
                                                             rounded-full p-1.5 opacity-0 group-hover:opacity-100 
                                                             transition-opacity duration-300 hover:bg-red-600
                                                             transform hover:scale-110"
                                                    onClick={() => handleDeleteProductImage(index)}
                                                >
                                                    <FaDeleteLeft className="text-sm" />
                                                </button>
                                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 
                                                             text-white text-xs px-2 py-1 rounded-full">
                                                    {index + 1}/{data.productImage.length}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
        
                            {/* Campos específicos por subcategoría */}
                            {data.subcategory && (
                                <div className='col-span-2 border-t pt-4 mt-4'>
                                    <h3 className='text-lg font-semibold mb-3 text-gray-800'>
                                        Especificaciones de {getCurrentSubcategoryLabel()}
                                    </h3>
                                    <ProductSpecifications
                                        subcategory={data.subcategory}
                                        data={data}
                                        handleOnChange={handleOnChange}
                                    />
                                </div>
                            )}
        
                            {/* Botón de Actualizar */}
                            <div className='col-span-2 flex justify-end'>
                                <button 
                                    type="submit" 
                                    className='px-6 py-2 bg-blue-600 text-white rounded-lg 
                                            hover:bg-blue-700 transition-colors duration-300 
                                            flex items-center gap-2'
                                >
                                    Actualizar Producto
                                </button>
                            </div>
                        </form>
                    </div>
        
                    {openFullScreenImage && (
                        <DisplayImage 
                            onClose={() => setOpenFullScreenImage(false)} 
                            imgUrl={fullScreenImage} 
                        />
                    )}
                </div>
            );
        };
        
        export default AdminEditProduct;