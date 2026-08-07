const { default: SummaryApi } = require("../common");

const fetchCategoryWiseProduct = async (category, subcategory = null, options = {}) => {
  const requestBody = {
    category,
    ...(subcategory && { subcategory }),
    ...(options.excludeId && { excludeId: options.excludeId }),
    limit: options.limit || 24
  };

  const response = await fetch(SummaryApi.categoryWiseProduct.url, {
    method: SummaryApi.categoryWiseProduct.method,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  
  const dataResponse = await response.json();
  return dataResponse;
};

export default fetchCategoryWiseProduct;
