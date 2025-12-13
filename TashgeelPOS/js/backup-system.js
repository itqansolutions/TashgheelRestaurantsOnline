// backup-system.js

document.addEventListener('DOMContentLoaded', () => {
  const backupBtn = document.getElementById('create-backup');
  const restoreInput = document.getElementById('restore-backup');

  if (backupBtn) {
    backupBtn.addEventListener('click', createBackup);
  }

  if (restoreInput) {
    restoreInput.addEventListener('change', restoreBackup);
  }
});

function createBackup() {
  const data = {};
  for (let key in localStorage) {
    data[key] = localStorage.getItem(key);
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const filename = `POS-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  alert('Backup file created successfully.');
}

function restoreBackup(event) {
  const file = event.target.files[0];
  if (!file) return alert('No file selected.');

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      for (let key in data) {
        localStorage.setItem(key, data[key]);
      }
      alert('Backup restored successfully. Reloading...');
      location.reload();
    } catch (err) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
}
