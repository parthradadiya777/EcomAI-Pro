export const MARKETPLACE_RULES = {
  Myntra:{label:"Myntra",required:["vendorArticleNumber","vendorArticleName","brand","Prominent Colour","Fabric","Product Details","Product Display Name","Front Image","Side Image","Back Image"],maxTitle:80},
  Amazon:{label:"Amazon",required:["SKU","Item Name","Brand","Bullet Points","Product Description","Generic Keywords"],maxTitle:200},
  Flipkart:{label:"Flipkart",required:["Seller SKU","Product Title","Brand","Color","Material","Description","Search Keywords"],maxTitle:120},
  Meesho:{label:"Meesho",required:["Product Name","Variation","Meesho Price","MRP","GST %","HSN ID","Net Weight","Inventory","Country Of Origin","SKU ID","Product Description"],maxTitle:100},
  Shopify:{label:"Shopify",required:["Handle","Title","Body HTML","Product Type","Tags"],maxTitle:255}
};

const normKey=v=>String(v??"").toLowerCase().replace(/[^a-z0-9]+/g,"").trim();
const normalize=v=>String(v??"").replace(/\s+/g," ").trim();

export function detectMarketplaceTemplate(matrix,sheetNames=[]){
  const rawTop=(matrix||[]).slice(0,25).flat().map(x=>String(x??""));
  const splitFieldNames=rawTop.flatMap(x=>x.split(/\n+/).map(normalize).filter(Boolean));
  const all=[...rawTop,...splitFieldNames].map(normKey).filter(Boolean);
  const has=k=>all.includes(normKey(k));
  const fields=splitFieldNames.map(normKey);
  const hasField=k=>fields.includes(normKey(k));
  const names=(sheetNames||[]).map(x=>String(x).toLowerCase());

  // Platform-specific detection is isolated here so adding a new marketplace
  // cannot change the Myntra adapter or the listing UI.
  const meeshoSignals=[
    "productName","variation","meeshoPrice","wrongDefectiveReturnsPrice",
    "netWeightgms","productIdStyleId","skuId","gst","hsnId"
  ];
  if(names.some(n=>/meesho|body[-_ ]?hair|example sheet/.test(n)) ||
     meeshoSignals.some(hasField)) return "Meesho";

  if((has("styleId")||has("styleGroupId")) &&
     (has("vendorSku")||has("vendorArticleNumber")||has("vendorArticleName"))) return "Myntra";
  if(has("vendorArticleNumber")||has("vendorArticleName")) return "Myntra";

  if((has("sellerSku")||has("itemSku")||has("sku")) &&
     (has("productDescription")||has("itemDescription")||has("productDescriptionText")) &&
     (has("genericKeywords")||has("searchTerms"))) return "Amazon";

  if((has("sellerSku")||has("sku")) &&
     (has("productTitle")||has("title")) &&
     (has("sellingPrice")||has("mrp")||has("price"))) return "Flipkart";

  if(has("handle")&&(has("bodyHtml")||has("productType")||has("vendor"))) return "Shopify";
  return null;
}

export function marketplaceImageField(field,platform){
  const f=normKey(field);
  if(platform==="Myntra") return /frontimage|sideimage|backimage|detailangle|lookshotimage/.test(f);
  if(platform==="Amazon") return /mainimageurl|otherimageurl|imageurl|image1|image2|image3|image4|image5|image6|image7|image8/.test(f);
  if(platform==="Flipkart") return /image|imageurl|frontimage|sideimage|backimage/.test(f);
  if(platform==="Meesho") return /image|imageurl|catalogimage/.test(f);
  if(platform==="Shopify") return /image|src/.test(f);
  return false;
}

export const PLATFORM_ADAPTERS={
  Myntra:{rules:MARKETPLACE_RULES.Myntra},
  Meesho:{rules:MARKETPLACE_RULES.Meesho},
  Amazon:{rules:MARKETPLACE_RULES.Amazon},
  Flipkart:{rules:MARKETPLACE_RULES.Flipkart},
  Shopify:{rules:MARKETPLACE_RULES.Shopify}
};
