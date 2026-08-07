// productDisplay.js
document.addEventListener('DOMContentLoaded', () => {
  const productDetailsContainer = document.getElementById('product-details');
  const packageItems = document.querySelectorAll('.package-item');

  packageItems.forEach(item => {
    item.addEventListener('click', async (event) => {
      event.preventDefault();
      const packageId = item.getAttribute('data-package-id');
      const productDetails = await fetchProductDetails(packageId);
      displayProductDetails(productDetails);
    });
  });

  async function fetchProductDetails(packageId) {
    // Fetch product details from a JSON file or API
    // For example, using fetch:
    const response = await fetch('/path/to/product-details.json');
    const data = await response.json();
    return data[packageId];
  }

  function displayProductDetails(productDetails) {
    productDetailsContainer.innerHTML = `
      <h3>${productDetails.name}</h3>
      <p>Price: ${productDetails.price}</p>
      <p>Description: ${productDetails.description}</p>
      <!-- Add more details as needed -->
    `;
  }
});