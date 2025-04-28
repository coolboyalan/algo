class Service {
  static Model = null;

  static async create(data) {
    const createdData = await this.Model.create(data);
    return createdData;
  }

  static async get(id, filters = {}) {
    if (!id) {
      return await this.Model.find(filters);
    }
    return await this.Model.findById(id);
  }

  static async getWithQuery(query) {
    const data = await this.Model.sequelize.query(query);
    return data;
  }

  static async update(id, updates) {
    const document = await this.Model.findById(id);
    document.updateFields(updates);
    await document.save();
    return document;
  }

  static async deleteDoc(id) {
    const document = await this.Model.findById(id);
    await document.destroy({ force: true });
  }
}

export default Service;
