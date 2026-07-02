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
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        sh 'npm ci'
      }
    }

    stage('Run unit tests') {
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        sh 'npm run test:coverage'
      }
    }

    stage('Run E2E tests') {
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        sh 'npm run test:e2e:coverage || true'
      }
    }

    stage('Build backend') {
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        sh 'npm run build'
      }
    }

    stage('Quality analysis with SonarQube') {
      agent {
        docker {
          image 'node:22-alpine'
          reuseNode true
        }
      }
      steps {
        script {
          withCredentials([string(credentialsId: 'sonar-backend-token', variable: 'SONAR_TOKEN')]) {
            sh '''
              npx sonar-scanner \
                -Dsonar.projectKey=cicd-tasklist-backend \
                -Dsonar.projectName=cicd-tasklist-backend \
                -Dsonar.sources=src \
                -Dsonar.tests=src/__tests__ \
                -Dsonar.language=ts \
                -Dsonar.sourceEncoding=UTF-8 \
                -Dsonar.host.url=http://localhost:9000 \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.exclusions=src/__tests__/**,**/node_modules/**,**/dist/**,**/coverage/** \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
            '''
          }
        }
      }
    }

    stage('Security scan with Trivy') {
      steps {
        sh '''
          if ! command -v trivy &> /dev/null; then
            docker run --rm -v $(pwd):/root aquasec/trivy fs /root --exit-code 0 --format table || true
          else
            trivy fs --exit-code 0 --format table . || true
          fi
        '''
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -t $DOCKER_IMAGE .'
      }
    }

    stage('Security scan Docker image with Trivy') {
      steps {
        sh '''
          if ! command -v trivy &> /dev/null; then
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --exit-code 0 --format table $DOCKER_IMAGE || true
          else
            trivy image --exit-code 0 --format table $DOCKER_IMAGE || true
          fi
        '''
      }
    }

    stage('Publish Docker image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push $DOCKER_IMAGE
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
