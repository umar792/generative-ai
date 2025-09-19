// helpers/classifyQuery.js
export const classifyQuery = (prompt) => {
     const backendKeywords = [
        // Backend development
        "nodejs", "express", "prisma", "python", "fastapi",
        "django", "flask", "backend", "model", "migration",
        "database", "schema", "auth", "folder", "project",
        
        // System / filesystem / commands
        "directory", "dir", "cd", "ls", "mkdir", "touch", "pwd", 
        "file", "path", "filesystem", "read", "write", "edit",
      ];
      
  
    const words = prompt.toLowerCase();
  
    // if it's too short and no backend keywords → chat
    if (prompt.split(" ").length <= 4 && !backendKeywords.some(k => words.includes(k))) {
      return "chat";
    }
  
    // if backend-related
    if (backendKeywords.some(k => words.includes(k))) {
      return "backend";
    }
  
    // default fallback → chat
    return "chat";
  };
  