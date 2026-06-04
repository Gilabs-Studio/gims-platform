allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

subprojects {
    fun configureNamespace(android: Any, name: String) {
        try {
            val namespaceMethod = android.javaClass.getMethod("getNamespace")
            val currentNamespace = namespaceMethod.invoke(android)
            if (currentNamespace == null) {
                val setNamespaceMethod = android.javaClass.getMethod("setNamespace", String::class.java)
                val cleanName = name.replace(Regex("[^a-zA-Z0-9]"), "")
                setNamespaceMethod.invoke(android, "com.gilabs.gims.pos.fallback.$cleanName")
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    fun stripManifestPackage(proj: Project) {
        try {
            val manifestFile = proj.file("src/main/AndroidManifest.xml")
            if (manifestFile.exists()) {
                var content = manifestFile.readText()
                if (content.contains("package=")) {
                    content = content.replace(Regex("""package\s*=\s*"[^"]*""""), "")
                    manifestFile.writeText(content)
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    fun forceCompileSdk(android: Any) {
        try {
            val compileSdkMethod = android.javaClass.getMethod("compileSdkVersion", Int::class.javaPrimitiveType)
            compileSdkMethod.invoke(android, 34)
        } catch (e: Exception) {
            try {
                val setCompileSdkMethod = android.javaClass.getMethod("setCompileSdkVersion", Int::class.javaPrimitiveType)
                setCompileSdkMethod.invoke(android, 34)
            } catch (e2: Exception) {
                // Ignore
            }
        }
    }

    val android = project.extensions.findByName("android")
    if (android != null) {
        configureNamespace(android, project.name)
        stripManifestPackage(project)
        forceCompileSdk(android)
    } else if (!project.state.executed) {
        project.afterEvaluate {
            val evaluatedAndroid = project.extensions.findByName("android")
            if (evaluatedAndroid != null) {
                configureNamespace(evaluatedAndroid, project.name)
                stripManifestPackage(project)
                forceCompileSdk(evaluatedAndroid)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
