import React from 'react';
import { Link } from 'react-router-dom';
import productCategory from '../helpers/productCategory';
import { ChevronRightIcon } from 'lucide-react';

const MobileCategoriesPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 p-4 shadow-md bg-blue-600 text-white flex items-center">
        <h1 className="text-xl font-semibold flex-grow text-center">Categorías</h1>
      </header>

      <div className="p-4 space-y-6">
        {productCategory.map((category) => (
          <div 
            key={category.id} 
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-blue-50 p-4 border-b border-blue-100">
              <h2 className="text-lg font-bold text-blue-800">{category.label}</h2>
            </div>
            
            <div>
              {category.subcategories.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/categoria-producto?category=${category.value}&subcategory=${subcategory.value}`}
                  className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors group"
                >
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                    {subcategory.label}
                  </span>
                  <ChevronRightIcon 
                    className="text-gray-400 group-hover:text-blue-600 transition-colors" 
                    size={20} 
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileCategoriesPage;