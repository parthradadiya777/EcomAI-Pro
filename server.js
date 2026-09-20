      fill:"Keep all existing title/description/keywords exactly unchanged. Generate only fields that are blank.",
      fresh:"Create fresh marketplace-ready title, description, bullets and keywords from the supplied verified facts and the image."
    }[mode]||"Enhance the existing content without inventing facts.";
    const prompt=`You are EcomAI Pro Listing AI for ${platform}.
Analyze the supplied product image for ecommerce cataloging.
${modeInstruction}
Never invent factual specifications. Do not claim a fabric, material, size, measurement, certification, HSN, feature or performance benefit unless it is explicitly supplied in the source data or clearly visible and safe to infer. If uncertain, return null or "Needs seller input".
For color, identify the dominant visible product color, not the background/model skin tone.
Create concise marketplace-ready copy. The title should identify the actual product, not the model or background. Description should describe only verified product attributes.
Return ONLY JSON with keys: title, description, bullets, keywords, category, productType, color, fabric, pattern, gender, fit, neckline, sleeveType, visibleSizes, occasion, confidence. REQUIRED: always provide title, description, keywords and color when they can be supported by the seller product image/source. The SKU is supplied by the seller/image-group mapping and must not be invented or changed by vision AI. FLEXIBLE FIELDS: productType, category, fabric, pattern, attributes and other catalog attributes are NOT fixed; infer them from the seller product image + seller Excel/source. If the product visibly differs from an existing value, correct that value rather than blindly preserving it. Never use competitor data to determine seller color or SKU.
Existing/source data:
${JSON.stringify(source)}
Competitor references provide ONLY market-language research for these fields: title structure, product type, description style, fabric terminology, pattern terminology, keywords and attributes. Use them to understand relevant marketplace wording, but never copy their title/description verbatim. IMPORTANT: determine the seller product color, dominant color and other visual appearance ONLY from the seller product image and seller Excel/source data; do not take color from competitor references. Never transfer a competitor-only fact to the seller product unless it is also supported by the seller source or clearly visible in the seller product image. Treat competitor title/description/keywords as language and structure reference only; seller product facts always take priority.
Seller instruction:
${instruction||"None"}
Title task:
${String(source.titleTask||"").trim()||"Generate the product title from the seller product image and verified seller facts. Return an original, product-specific marketplace title."}`;
    const body={
      contents:[{parts:[
        {text:prompt},
        {inline_data:{mime_type:safeMime,data:match[2]}}
      ]}],
      generationConfig:{responseMimeType:"application/json"}
    };
    let txt="", lastError="";
    if(key){
      try{
        const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
          method:"POST",
          headers:{"content-type":"application/json","x-goog-api-key":key},
          body:JSON.stringify(body)
        });
        txt=await r.text();
        if(!r.ok)throw new Error(txt.slice(0,500));
      }catch(e){lastError="Gemini visual analysis failed: "+(e?.message||"unknown error");txt=""}
    }
    if(!txt&&openaiKey){
      try{
        const content=[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageData,detail:"high"}}];
        const rr=await fetch("https://api.openai.com/v1/chat/completions",{
          method:"POST",
          headers:{"content-type":"application/json","authorization":"Bearer "+openaiKey},
          body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content}],temperature:0.2,response_format:{type:"json_object"}})
        });
        const tt=await rr.text();
        if(!rr.ok)throw new Error(tt.slice(0,500));
        const oj=JSON.parse(tt);
        const od=oj?.choices?.[0]?.message?.content||"";
        return res.json({ok:true,data:JSON.parse(od)});
      }catch(e){lastError="OpenAI visual analysis failed: "+(e?.message||"unknown error")}
    }
    if(!txt)return res.status(502).json({ok:false,error:lastError||"Visual analysis failed."});
    const j=JSON.parse(txt);
    const raw=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    let data;
    try{data=JSON.parse(raw)}catch{
      const a=raw.indexOf("{"),b=raw.lastIndexOf("}");
      if(a>=0&&b>a)data=JSON.parse(raw.slice(a,b+1));
    }
    if(!data||typeof data!=="object")return res.status(502).json({ok:false,error:"Visual analysis returned invalid JSON."});

    // A title is mandatory for the image-first master listing. Some vision responses
    // can be valid JSON but still omit the title, so do not pass an empty title back
    // to the client. Retry with a small title-only request before failing.
    const titleValue=data.title||data.productDisplayName||data.productName;
    if(!String(titleValue||"").trim()){
      const titlePrompt=`You are the title engine for EcomAI Pro. Look ONLY at the supplied seller product image and the verified seller source data below. Create ONE original ecommerce product title. Identify the actual product visible in the image. Use competitor references only for marketplace wording/structure; never copy a competitor title and never take competitor-only product facts. Do not mention model, pose, background or photography. Do not invent fabric, embroidery, pattern, features, measurements or other specifications. Include visible color only when clear. Return ONLY JSON: {"title":"..."}.
Marketplace: ${platform}
Seller source: ${JSON.stringify(source)}
Competitor reference language: ${JSON.stringify((source&&source.competitorReferences)||[])}`;
      let retryData=null;
      if(key){
        try{
          const rr=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
            method:"POST",
            headers:{"content-type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({
              contents:[{parts:[{text:titlePrompt},{inline_data:{mime_type:safeMime,data:match[2]}}]}],
              generationConfig:{responseMimeType:"application/json",temperature:0.1}
            })
          });
          const tt=await rr.text();
          if(rr.ok){
            const jj=JSON.parse(tt);
            const raw2=jj?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
            try{retryData=JSON.parse(raw2)}catch{const aa=raw2.indexOf("{"),bb=raw2.lastIndexOf("}");if(aa>=0&&bb>aa)retryData=JSON.parse(raw2.slice(aa,bb+1))}
          }
        }catch{}
      }
      if(!String(retryData?.title||"").trim()&&openaiKey){
        try{
          const rr=await fetch("https://api.openai.com/v1/chat/completions",{
            method:"POST",
            headers:{"content-type":"application/json","authorization:"Bearer "+openaiKey},
            body:JSON.stringify({
              model:"gpt-4o-mini",
              messages:[{role:"user",content:[{type:"text",text:titlePrompt},{type:"image_url",image_url:{url:imageData,detail:"high"}}]}],
              temperature:0.1,
              response_format:{type:"json_object"}
            })
          });
          const tt=await rr.text();
          if(rr.ok){
            const jj=JSON.parse(tt),raw2=jj?.choices?.[0]?.message?.content||"";
            retryData=JSON.parse(raw2);
          }
        }catch{}
      }
      if(String(retryData?.title||"").trim()){
        data={...data,title:String(retryData.title).trim()};
      }else{
        return res.status(502).json({ok:false,error:"Vision AI returned no product-specific title. The seller image could not be identified reliably."});
      }
    }
    return res.json({ok:true,data});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||"Listing visual analysis failed."})}
});


app.post("/api/listing-image-upload",async(req,res)=>{
  try{
    const cloudName=process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey=process.env.CLOUDINARY_API_KEY;
    const apiSecret=process.env.CLOUDINARY_API_SECRET;
    if(!cloudName||!apiKey||!apiSecret)return res.status(503).json({ok:false,error:"Image hosting is not configured. Add Cloudinary credentials to Render."});
    const imageData=String(req.body?.imageData||"").trim();
    const filename=String(req.body?.filename||"product").replace(/[^a-zA-Z0-9._-]+/g,"_");
    if(!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(imageData))return res.status(400).json({ok:false,error:"Invalid product image."});
    const form=new FormData();
    form.append("file",imageData);
    form.append("public_id","ecomai/listings/"+filename.replace(/\.[^.]+$/,""));
    form.append("api_key",apiKey);
    form.append("timestamp",String(Math.floor(Date.now()/1000)));
    const crypto=await import("node:crypto");
    const timestamp=form.get("timestamp");
    const publicId=form.get("public_id");
    const signature=crypto.createHash("sha1").update("public_id="+publicId+"&timestamp="+timestamp+apiSecret).digest("hex");
    form.append("signature",signature);
    const r=await fetch("https://api.cloudinary.com/v1_1/"+encodeURIComponent(cloudName)+"/image/upload",{method:"POST",body:form});
    const txt=await r.text();