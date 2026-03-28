export function createSlug(str: string): string {
  if (!str) return "";

  let slug = str.toLowerCase();

  // Convert Vietnamese characters to ASCII
  slug = slug.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, "a");
  slug = slug.replace(/[éèẻẽẹêếềểễệ]/g, "e");
  slug = slug.replace(/[iíìỉĩị]/g, "i");
  slug = slug.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, "o");
  slug = slug.replace(/[úùủũụưứừửữự]/g, "u");
  slug = slug.replace(/[ýỳỷỹỵ]/g, "y");
  slug = slug.replace(/đ/g, "d");
  

  // Remove combining diacritics
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace spaces and special characters with hyphens
  slug = slug
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, "-")         // Replace spaces with hyphens
    .replace(/-+/g, "-")          // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "");     // Trim hyphens from start and end

  return slug;
}
