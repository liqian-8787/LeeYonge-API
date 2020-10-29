const productCategory={
    categories:[],
    init(){
        this.categories.push(
         {
                type:'Accessory',
                description:`This is Accessory`

         });
         this.categories.push(
            {
                type:'Gifts',                
                description:`This is Gifts`,
                
            }
        );
        this.categories.push(
            {
                type:'Home Office',               
                description:`This is Home Office`,
               
            }
        );
        this.categories.push(
            {
                type:'Snack',                
                description:`This is Snack`,
               
            }
        );   
    },
    getProductCategory()
    {
        const newCategories = this.categories.map((category)=>{
            return {
                type:category.type,
                slug:category.type.replace(/ /g,"_"),
                description:category.description,
              
            }
        });
        return newCategories;
    }
}
 productCategory.init();
 module.exports=productCategory;