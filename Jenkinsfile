pipeline {
  agent any

  environment {
    NODE_ENV = 'test'
    DOCKER_IMAGE = 'thibaultlefay/tasklist-backend:latest'
    SONAR_HOST_URL = 'http://localhost:9000'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        bat 'npm ci'
      }
    }

    stage('Run unit tests') {
      steps {
        bat 'npm run test:coverage'
      }
    }

    stage('Run E2E tests') {
      steps {
        bat 'npm run test:e2e:coverage'
      }
    }

    stage('Build backend') {
      steps {
        bat 'npm run build'
      }
    }

    stage('Quality analysis with SonarQube') {
      steps {
        script {
          withCredentials([string(credentialsId: 'sonar-backend-token', variable: 'SONAR_TOKEN')]) {
            bat """
              npx sonar-scanner ^
                -Dsonar.projectKey=cicd-tasklist-backend ^
                -Dsonar.projectName=cicd-tasklist-backend ^
                -Dsonar.sources=src ^
                -Dsonar.tests=src/__tests__ ^
                -Dsonar.language=ts ^
                -Dsonar.sourceEncoding=UTF-8 ^
                -Dsonar.host.url=http://localhost:9000 ^
                -Dsonar.login=%SONAR_TOKEN% ^
                -Dsonar.exclusions=src/__tests__/**,**/node_modules/**,**/dist/**,**/coverage/** ^
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
            """
          }
        }
      }
    }

    stage('Security scan with Trivy') {
      steps {
        bat '''
          where trivy >nul 2>nul
          if %errorlevel% neq 0 (
            echo Trivy not found, skipping filesystem scan
            exit /b 0
          )
          trivy fs --exit-code 0 --format table .
        '''
      }
    }

    stage('Build Docker image') {
      steps {
        bat 'docker build -t %DOCKER_IMAGE% .'
      }
    }

    stage('Security scan Docker image with Trivy') {
      steps {
        bat '''
          where trivy >nul 2>nul
          if %errorlevel% neq 0 (
            echo Trivy not found, skipping image scan
            exit /b 0
          )
          trivy image --exit-code 0 --format table %DOCKER_IMAGE%
        '''
      }
    }

    stage('Publish Docker image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          bat '''
            echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
            docker push %DOCKER_IMAGE%
            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit.xml,coverage/**', allowEmptyArchive: true
      junit testResults: 'reports/junit.xml', allowEmptyResults: true
    }
    success {
      echo ' Backend Pipeline completed successfully!'
    }
    failure {
      echo ' Backend Pipeline failed!'
    }
  }
}
