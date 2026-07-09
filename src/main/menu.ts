import { Menu, app, BrowserWindow } from 'electron'

export type MenuAction = 'library' | 'import' | 'help'

export function buildAppMenu(mainWindow: BrowserWindow): void {
  const send = (action: MenuAction): void => {
    mainWindow.webContents.send('menu:action', action)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Library',
          accelerator: 'CmdOrCtrl+L',
          click: () => send('library')
        },
        {
          label: 'Import Course...',
          accelerator: 'CmdOrCtrl+I',
          click: () => send('import')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Dev Tools',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ClassHub',
          click: () => send('help')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
