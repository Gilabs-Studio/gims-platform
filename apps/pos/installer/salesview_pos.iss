#define MyAppName "Salesview Pos"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "com.gilabs.gims"
#define MyAppExeName "salesview_pos.exe"
#define MyAppSourceDir "..\build\windows\x64\runner\Release"

[Setup]
AppId={{9B09AA41-AF15-4E18-8A2B-7BEBFB43F1F1}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Salesview Pos
DefaultGroupName=Salesview Pos
OutputDir=..\build\windows\installer\output
OutputBaseFilename=salesview_pos_setup
SetupIconFile=..\windows\runner\resources\app_icon.ico
UninstallDisplayIcon={app}\salesview_pos.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
DisableProgramGroupPage=no
DisableReadyMemo=no
VersionInfoVersion=1.0.0.0
VersionInfoProductVersion=1.0.0.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"

[Files]
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Salesview Pos"; Filename: "{app}\salesview_pos.exe"
Name: "{commondesktop}\Salesview Pos"; Filename: "{app}\salesview_pos.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\salesview_pos.exe"; Description: "Launch Salesview Pos"; Flags: nowait postinstall skipifsilent
