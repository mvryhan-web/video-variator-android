; JARVIX NEW test installer: unsigned, no auto-start, no elevation, no AI provider keys.
#define AppName "JARVIX NEW"
#define AppVersion "0.1.0-test"
[Setup]
AppId=JARVIX-NEW-DESKTOP-TEST
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=DEEPSYQ
DefaultDirName={localappdata}\Programs\JARVIX_NEW
DefaultGroupName=JARVIX NEW
OutputDir=..\dist
OutputBaseFilename=Jarvix-New-Windows-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
WizardStyle=modern
UninstallDisplayIcon={app}\JARVIX_NEW.exe
[Files]
Source: "..\dist\JARVIX_NEW\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs
[Icons]
Name: "{autoprograms}\JARVIX NEW (Test)"; Filename: "{app}\JARVIX_NEW.exe"
Name: "{autodesktop}\JARVIX NEW (Test)"; Filename: "{app}\JARVIX_NEW.exe"; Tasks: desktopicon
[Tasks]
Name: "desktopicon"; Description: "Создать ярлык на рабочем столе"; Flags: unchecked
[Run]
Filename: "{app}\JARVIX_NEW.exe"; Description: "Запустить JARVIX NEW"; Flags: nowait postinstall skipifsilent
