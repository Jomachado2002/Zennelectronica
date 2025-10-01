const { default: SummaryApi } = require("../common");

const fetchCategoryWiseProduct = async (category, subcategory = null) => {
  const requestBody = {
    category,
    ...(subcategory && { subcategory })
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
