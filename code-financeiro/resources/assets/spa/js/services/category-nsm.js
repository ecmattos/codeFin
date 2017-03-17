import {CategoryRevenue, CategoryExpense} from './resources';
export class CategoryFormat {
    static getCategoryFormatted(categories) {
        let categoriesFormatted = this._formatCategories(categories);
        categoriesFormatted.unshift({
            id: 0,
            text: 'Nenhuma Categoria',
            level: 0,
            hasChildren: false
        });
        return categoriesFormatted;
    }

    static _formatCategories(categories, categoryCollection = []) {
        for (let category of categories) {
            let categoryNew = {
                id: category.id,
                text: category.name,
                level: category.depth,
                hasChildren: category.children.data.length > 0
            };
            categoryCollection.push(categoryNew);
            this._formatCategories(category.children.data, categoryCollection);
        }
        return categoryCollection;
    }
}

export class CategoryService {

    constructor(type){
        this.resource = type == 'revenue' ? CategoryRevenue : CategoryExpense;
    }

     save(category, parent, categories, categoryOriginal) {
        if (category.id === 0) {
            return this.new(category, parent, categories)
        } else {
            return this.edit(category, parent, categories, categoryOriginal)
        }
    }

     new(category, parent, categories) {
        let categoryCopy = $.extend(true, {}, category);
        if (categoryCopy.parent_id === null) {
            delete categoryCopy.parent_id;
        }
        return this.resource.save(categoryCopy).then(response => {
            let categoryAdded = response.data.data;
            if (categoryAdded.parent_id === null) {
                categories.push(categoryAdded);
            } else {
                parent.children.data.push(categoryAdded)
            }
            return response;
        })
    }

     destroy(category, parent, categories){
        return this.resource.delete({id: category.id}).then(response => {
            if(parent){
                parent.children.data.$remove(category);
            }else{
                categories.$remove(category);
            }

            return response;
        })
    }

     edit(category, parent, categories, categoryOriginal) {
        let categoryCopy = $.extend(true, {}, category);
        if (categoryCopy.parent_id === null) {
            delete categoryCopy.parent_id;
        }
        let self = this;
        return this.resource.update({id: categoryCopy.id}, categoryCopy).then(response => {
            let categoryUpdated = response.data.data;
            if (categoryUpdated.parent_id === null) {
                /*
                 * Categoria alterada, está sem pai
                 * e antes ela tinha um pai
                 */
                if (parent) {
                    parent.children.data.$remove(categoryOriginal);
                    categories.push(categoryUpdated);
                    return response;
                }
            } else {
                /*
                 * Categoria alterada, com pai
                 */
                if (parent) {
                    /*
                     * Troca categoria de pai
                     */
                    if (parent.id != categoryUpdated.parent_id) {
                        parent.children.data.$remove(categoryOriginal);
                        CategoryService._addChild(categoryUpdated, categories);
                        return response;
                    }
                } else {
                    /*
                     * Tornar a categoria em um filho
                     * antes a categoria era um pai
                     */
                    categories.$remove(categoryOriginal);
                    CategoryService._addChild(categoryUpdated, categories);
                    return response;
                }
            }
            /*
             * Alteração somente no nome da categoria,
             * atualizar as informações na arvore
             */
            if (parent) {
                let index = parent.children.data.findIndex(element => {
                    return element.id == categoryUpdated.id;
                });
                parent.children.data.$set(index, categoryUpdated);
            } else {
                let index = categories.findIndex(element => {
                    return element.id == categoryUpdated.id;
                });
                categories.$set(index, categoryUpdated);

            }
            return response;
        })
    }

    query(){
        return this.resource.query();
    }

    static _addChild(child, categories) {
        let parent = this._findParent(child.parent.id, categories);
        parent.children.data.push(child)
    }

    static _findParent(id, categories) {
        let result = null;
        for (let category of categories) {
            if (id == category.id) {
                result = category;
                break;
            }
            result = this._findParent(id, category.children.data);
            if(result !== null){
                break;
            }
        }
        return result;
    }

}