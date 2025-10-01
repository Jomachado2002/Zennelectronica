import React from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import scrollTop from '../helpers/scrollTop';

const BrandCarousel = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  const brands = [
    { id: 1, logo: '/brands/Acer.jpg', name: 'Acer' },
    { id: 2, logo: '/brands/AMD.jpg', name: 'Amd' },
    { id: 3, logo: '/brands/asus.jpg', name: 'Asus' },
    { id: 4, logo: '/brands/EPSON.jpg', name: 'Epson' },
    { id: 5, logo: '/brands/MTEK.jpg', name: 'Mtek' },
    { id: 6, logo: '/brands/SAMSUNG.jpg', name: 'Samsung' },
  ];

  return (
    <div className="my-8">
      <Slider {...settings}>
        {brands.map((brand) => (
          <div key={brand.id} className="px-2">
            <Link to={`/buscar?q=${brand.name}`} onClick={() => scrollTop()}>  
              <div className="group relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-full h-16 object-contain transition-all duration-300 ease-in-out"
                />
              </div>
            </Link>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default BrandCarousel;
