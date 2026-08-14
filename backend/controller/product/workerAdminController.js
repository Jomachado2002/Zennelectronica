const {
  getSettings,
  saveSettings,
  requestRun,
  requestCancel,
  listLogs,
  isRunning,
  getActiveLog,
} = require('../../services/workerSettingsService');

async function getWorkerSettingsController(req, res) {
  try {
    const settings = await getSettings();
    const running = await isRunning();
    const activeLog = await getActiveLog();
    res.json({ success: true, settings, running, activeLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function putWorkerSettingsController(req, res) {
  try {
    const settings = await saveSettings(req.body || {});
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getWorkerLogsController(req, res) {
  try {
    const logs = await listLogs(Number(req.query.limit) || 40);
    const running = await isRunning();
    const activeLog = await getActiveLog();
    res.json({ success: true, logs, running, activeLog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function postWorkerRunController(req, res) {
  try {
    const quick = req.query.quick === '1' || req.body?.quick === true;
    const settings = await requestRun({ quick });
    res.json({
      success: true,
      queued: true,
      quick,
      message: 'Pedido en cola. jobs-api lo toma en segundos.',
      settings: settings.settings,
      log: settings.log,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ success: false, message: err.message });
  }
}

async function postWorkerCancelController(req, res) {
  try {
    const settings = await requestCancel();
    res.json({ success: true, settings, message: 'Cancelación pedida. El scrape para en el próximo lote.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getWorkerSettingsController,
  putWorkerSettingsController,
  getWorkerLogsController,
  postWorkerRunController,
  postWorkerCancelController,
};
