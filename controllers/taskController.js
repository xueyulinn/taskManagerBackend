import Task from "../models/Task.js";
import User from "../models/User.js";
import mongoose from "mongoose";
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;
    if (!Array.isArray(assignedTo)) {
      return res
        .status(400)
        .json({ message: "assignedTo must be an array of user IDs" });
    }
    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user.id,
      todoChecklist,
      attachments,
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.json({ error: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const filer = {};
    const { status } = req.query;
    if (status != "All") {
      filer.status = status;
    }

    let tasks;
    const user = await User.findById(req.user.id);

    // only admin can check all tasks
    if (user.role === "admin") {
      tasks = await Task.find(filer).populate(
        "assignedTo",
        "username email avatar"
      );
    } else {
      tasks = await Task.find({
        ...filer,
        assignedTo: user.id,
      }).populate("assignedTo", "username email avatar");
    }

    await Promise.all(
      tasks.map(async (task) => {
        const completedItem = task.todoChecklist.filter(
          (item) => item.completed
        ).length;
        return {
          ...task.toObject(),
          completedCount: completedItem,
        };
      })
    );

    // status summary
    const allTasks = await Task.countDocuments(
      user.role === "admin" ? {} : { assignedTo: user.id }
    );

    const pendingTasks = await Task.countDocuments({
      status: "Pending",
      ...(user.role !== "admin" && { assignedTo: user.id }),
    });

    const inProgressTasks = await Task.countDocuments({
      status: "In Progress",
      ...(user.role !== "admin" && { assignedTo: user.id }),
    });

    const completedTasks = await Task.countDocuments({
      status: "Completed",
      ...(user.role !== "admin" && { assignedTo: user._id }),
    });

    res.json({
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
      tasks,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const id = req.params.taskId;
    const task = await Task.findById(id).populate(
      "assignedTo",
      "username email avatar _id"
    );
    return res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const [totalTasks, completedTasks, pendingTasks, overdueTasks] =
      await Promise.all([
        Task.countDocuments(),
        Task.countDocuments({ status: "Completed" }),
        Task.countDocuments({ status: "Pending" }),
        Task.countDocuments({
          status: { $ne: "Completed" },
          dueDate: { $lt: new Date() },
        }),
      ]);

    // aggregation pipelines as array of objects
    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskStatuses = ["Pending", "In Progress", "Completed"];
    //(acc, curVal)
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response keys
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.json({
      statistics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const getUserDashboardData = async (req, res) => {
  try {
    const [totalTasks, completedTasks, pendingTasks, overdueTasks] =
      await Promise.all([
        Task.countDocuments(),
        Task.countDocuments({ status: "Completed", assignedTo: req.user.id }),
        Task.countDocuments({ status: "Pending", assignedTo: req.user.id }),
        Task.countDocuments({
          status: { $ne: "Completed" },
          dueDate: { $lt: new Date() },
          assignedTo: req.user.id,
        }),
      ]);
    const taskDistributionRaw = await Task.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskStatuses = ["Pending", "In Progress", "Completed"];

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevels = taskPriorities.reduce((acc, cur) => {
      acc[cur] =
        taskPriorityLevelsRaw.find((item) => item._id === cur)?.count || 0;
      return acc;
    }, {});

    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.json({
      statistics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    const task = await Task.findById(req.params.taskId);
    task.title = title || task.title;
    task.description = description || task.description;
    task.priority = priority || task.priority;
    task.dueDate = dueDate || task.dueDate;
    task.todoChecklist = todoChecklist || task.todoChecklist;
    task.attachments = attachments || task.attachments;

    if (!assignedTo || !Array.isArray(assignedTo)) {
      return res
        .status(400)
        .json({ message: "assignedTo must be an array of user IDs" });
    }
    task.assignedTo = assignedTo || task.assignedTo;
    const updatedTask = await task.save();
    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // check if the current user is one of assigned members
    const assignedUser = task.assignedTo.some(
      (assignedId) => assignedId.toString() === req.user.id.toString()
    );
    const user = await User.findById(req.user.id);

    // only the assigned team member or admin can update status
    if (!assignedUser && user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });

    task.status = req.body.status || task.status;

    if (task.status === "Completed") {
      task.todoChecklist.forEach((item) => (item.completed = true));
      task.progress = 100;
    }
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const updateTaskChecklist = async (req, res) => {
  try {
    const { todoChecklist } = req.body;
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.error(404).json({ message: "Task not found" });
    const user = await User.findById(req.user.id);
    if (!task.assignedTo.includes(user.id) && user.role !== "admin")
      return res.status(403).json({ message: "Not authorized" });

    // update task status
    task.todoChecklist = todoChecklist;

    const completedCount = task.todoChecklist.filter(
      (item) => item.completed === true
    ).length;

    const totalCount = task.todoChecklist.length;
    task.progress =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else task.status = "Pending";

    await task.save();
    const updatedTask = await task.populate(
      "assignedTo",
      "username email avatar"
    );
    res.json({ updatedTask: updatedTask });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.status(201).json({ message: "Deleted successfully" });
  } catch (error) {
    res.json({ error: error.message });
  }
};

export {
  createTask,
  getTasks,
  deleteTask,
  getTaskById,
  updateTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
};
