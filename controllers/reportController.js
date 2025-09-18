import exceljs from "exceljs";
import Task from "../models/Task.js";
import User from "../models/User.js";
const exportTasksReport = async (req, res) => {
  try {
    const tasks = await Task.find().populate(
      "assignedTo",
      "username email -_id"
    );
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet("Tasks Report");
    sheet.columns = [
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 50 },
    ];

    tasks.forEach((task) => {
      task.assignedTo
        .map((item) => `${item.username} (${item.email})`)
        .join(", ");
      sheet.addRow({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo.length > 0 ? task.assignedTo : "Unassigned",
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tasks_report.xlsx"'
    );

    return workbook.xlsx.write(res).then(() => {
      res.end();
    });
  } catch (error) {
    res.json({
      message: "Error while exporting reports",
      error: error.message,
    });
  }
};

const exportUsersReport = async (req, res) => {
  try {
    // 拿到pojo对象而非文档对象
    const users = await User.find().select("username email _id").lean();

    const tasks = await Task.find();

    let usersWithTasks = {};
    users.forEach((user) => {
      usersWithTasks[user._id] = {
        username: user.username,
        email: user.email,
        totalTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
      };
    });

    tasks.forEach((task) => {
      if (task.assignedTo.length > 0) {
        task.assignedTo.forEach((assignedId) => {
          usersWithTasks[assignedId].totalTasks += 1;
          if (task.status === "Pending") {
            usersWithTasks[assignedId].pendingTasks += 1;
          } else if (task.status === "In Progress") {
            usersWithTasks[assignedId].inProgressTasks += 1;
          } else if (task.status === "Completed") {
            usersWithTasks[assignedId].completedTasks += 1;
          }
        });
      }
    });

    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet("Users Report");
    sheet.columns = [
      { header: "Username", key: "username", width: 20 },
      { header: "Email", key: "email", width: 40 },
      { header: "TotalTasks", key: "totalTasks", width: 20 },
      { header: "PendingTasks", key: "pendingTasks", width: 20 },
      { header: "InProgressTasks", key: "inProgressTasks", width: 20 },
      { header: "CompletedTasks", key: "completedTasks", width: 20 },
    ];

    Object.values(usersWithTasks).forEach((user) => sheet.addRow(user));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="users_report.xlsx"'
    );

    return workbook.xlsx.write(res).then(() => res.end());
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export { exportTasksReport, exportUsersReport };
